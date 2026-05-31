import {
  createApplication,
  createContactQuery,
  createHeroLead,
  getApplicationById,
  getApplicationUanById,
  getRepaymentContactByPan,
  updateApplication,
  updateBankDetails,
  updateReferenceDetails,
  updateWorkDetails,
} from "../services/application.service.js";
import syncLeadToCRM from "../services/crm.service.js";
import { lookupIfsc } from "../services/ifsc.service.js";
import { sendOTPService, verifyOTPService } from "../services/otp.service.js";
import {
  buildRepaymentApplicationFromCRM,
  fetchCrmRepaymentDetails,
  fetchCrmRepayments,
  syncRepaymentToCRM,
} from "../services/repayment.service.js";
import crypto from "crypto";
import db from "../configs/db.js";
import { getAppSecret } from "../configs/secrets.js";
import logger from "../utils/logger.js";

const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || "2023-08-01";
const CASHFREE_ENV = (process.env.CASHFREE_ENV || "production").toLowerCase();
const CASHFREE_TIMEOUT_MS = Number(process.env.CASHFREE_API_TIMEOUT_MS || 8000);
const CASHFREE_BASE_URL =
  CASHFREE_ENV === "sandbox"
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";
const isCashfreeProduction = CASHFREE_ENV !== "sandbox";
const DEFAULT_PAYMENT_ORIGINS = [
  "https://waqtmoney.com",
  "https://www.waqtmoney.com",
];

const scheduleCrmSync = (id, reason) => {
  if (!id) return;

  setTimeout(async () => {
    try {
      const application = await getApplicationById(id);
      if (!application) {
        logger.warn("CRM sync skipped: application not found", { id, reason });
        return;
      }

      const crmSync = await syncLeadToCRM(application);
      logger.info("CRM sync completed:", {
        applicationId: application.application_id || id,
        reason,
        results: crmSync.crmSyncResults,
      });
    } catch (syncErr) {
      logger.error("Background CRM sync error:", syncErr.message);
    }
  }, 1500);
};

export const saveHeroLead = async (req, res, next) => {
  try {
    const result = await createHeroLead(req.body);

    res.status(200).json({
      success: true,
      message: "Lead submitted",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const saveContactQuery = async (req, res, next) => {
  try {
    const result = await createContactQuery(req.body);

    res.status(200).json({
      success: true,
      message: "Contact query submitted",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const applyLoan = async (req, res, next) => {
  try {
    const result = await createApplication(req.body);

    logger.debug("Application submitted:", {
      id: result.id,
      applicationId: result.applicationId,
      hasPan: Boolean(result.pan),
    });
    res.status(200).json({
      success: true,
      message: "Application submitted",
      data: result,
    });

  } catch (err) {
    next(err);
  }
};

export const updateApp = async (req, res, next) => {
  try {
    const { id, ...data } = req.body;
    await updateApplication(id, data);

    if (id && process.env.UAN_LOOKUP_BACKGROUND_ON_UPDATE === "true") {
      setTimeout(() => getApplicationUanById(id).catch((error) => {
        console.error("Background UAN sync error:", error.message);
      }), 0);
    }

    if (id && data.current_step === "video_kyc_completed") {
      scheduleCrmSync(id, "final_submit");
    }

    res.status(200).json({
      success: true,
      message: "Application updated",
      data: {
        nextPath:
          data.current_step === "documents_uploaded"
            ? "/user/customer-video-kyc"
            : data.current_step === "video_kyc_completed"
              ? "/user/loan-status"
            : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getApp = async (req, res, next) => {
  try {
    const application = await getApplicationById(req.params.id);

    if (!application) {
      res.status(404).json({
        success: false,
        message: "Application not found",
      });
      return;
    }

    const crmRepaymentSummary = await fetchCrmRepayments({
      sourceLeadId: application.application_id || req.params.id,
      loanId: application.loan_id || application.crm_loan_id,
    }).catch((error) => {
      logger.warn("CRM repayment summary unavailable:", {
        applicationId: application.application_id || req.params.id,
        message: error.message,
      });
      return null;
    });

    if (crmRepaymentSummary) {
      const localPaidAmount = Number(application.repayment_paid_amount || 0);
      const crmPaidAmount = Number(crmRepaymentSummary.paidAmount || 0);
      application.crm_repayments = crmRepaymentSummary.repayments;
      application.crm_repayment_latest = crmRepaymentSummary.latestRepayment;
      application.repayment_paid_amount = Math.max(
        Number.isFinite(localPaidAmount) ? localPaidAmount : 0,
        Number.isFinite(crmPaidAmount) ? crmPaidAmount : 0,
      );
      if (!application.repayment_status && crmRepaymentSummary.repaymentStatus) {
        application.repayment_status = crmRepaymentSummary.repaymentStatus;
      }
    }

    res.status(200).json({
      success: true,
      data: application,
    });
  } catch (err) {
    next(err);
  }
};

export const getRepaymentDetails = async (req, res, next) => {
  try {
    const identifier = String(req.params.id || req.query.id || "").trim();

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Repayment identifier is required",
      });
    }

    let repaymentDetails = await fetchCrmRepaymentDetails(identifier);

    if (!repaymentDetails && !/^[6-9]\d{9}$/.test(identifier.replace(/\D/g, "").slice(-10))) {
      const application = await getApplicationById(identifier).catch(() => null);
      const mobile = String(application?.mobile || "").replace(/\D/g, "").slice(-10);

      if (/^[6-9]\d{9}$/.test(mobile)) {
        repaymentDetails = await fetchCrmRepaymentDetails(mobile);
      }
    }

    if (!repaymentDetails) {
      return res.status(404).json({
        success: false,
        message: "Repayment is not available because this loan has not been disbursed yet.",
      });
    }

    return res.status(200).json({
      success: true,
      data: repaymentDetails,
    });
  } catch (err) {
    next(err);
  }
};

export const getApplicationUan = async (req, res, next) => {
  try {
    const uanNumber = await getApplicationUanById(req.params.id);

    res.status(200).json({
      success: true,
      status: "success",
      uan_number: uanNumber,
      uanNumber,
    });
  } catch (err) {
    next(err);
  }
};

const maskPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return "";
  return `XXXXXX${digits.slice(-4)}`;
};

const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);

const isApplicationStyleId = (value) =>
  /^WAQTMN-PD-/i.test(String(value || "").trim());

const getRealLoanId = (value) => {
  const id = String(value || "").trim();
  return id && !isApplicationStyleId(id) ? id : "";
};

const maskEmail = (email) => {
  const value = String(email || "").trim();
  const [name, domain] = value.split("@");
  if (!name || !domain) return "";
  return `${name.slice(0, 2)}***@${domain}`;
};

const getRepaymentOtpSecret = () => getAppSecret();

const encodeBase64Url = (value) =>
  Buffer.from(value).toString("base64url");

const signRepaymentOtpPayload = (payload) =>
  crypto
    .createHmac("sha256", getRepaymentOtpSecret())
    .update(payload)
    .digest("base64url");

const createRepaymentOtpToken = ({ pan, phone, email, applicationId, loanId, crmApplicationId }) => {
  const payload = encodeBase64Url(JSON.stringify({
    pan: String(pan || "").trim().toUpperCase(),
    phone: phone || "",
    email: email || "",
    applicationId: String(applicationId || ""),
    crmApplicationId: String(crmApplicationId || ""),
    loanId: String(loanId || ""),
    expires: Date.now() + 2 * 60 * 1000,
  }));
  const signature = signRepaymentOtpPayload(payload);

  return `${payload}.${signature}`;
};

const createRepaymentAccessToken = ({ pan, applicationId, loanId }) => {
  const payload = encodeBase64Url(JSON.stringify({
    pan: String(pan || "").trim().toUpperCase(),
    applicationId: String(applicationId || ""),
    loanId: String(loanId || ""),
    purpose: "repayment",
    expires: Date.now() + 15 * 60 * 1000,
  }));
  const signature = signRepaymentOtpPayload(payload);

  return `${payload}.${signature}`;
};

const verifyRepaymentAccessToken = (token, applicationId, loanId = "") => {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;

  const [payload, signature] = token.split(".");
  const expectedSignature = signRepaymentOtpPayload(payload);

  if (!signature || signature.length !== expectedSignature.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    return (
      parsed.purpose === "repayment" &&
      parsed.applicationId === String(applicationId || "") &&
      (!loanId || !parsed.loanId || parsed.loanId === String(loanId || "")) &&
      Date.now() <= Number(parsed.expires)
    );
  } catch {
    return false;
  }
};

const getContactFromRepaymentOtpToken = (token) => {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;

  const [payload, signature] = token.split(".");
  const expectedSignature = signRepaymentOtpPayload(payload);

  if (!signature || signature.length !== expectedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    if (Date.now() > Number(parsed.expires)) {
      return null;
    }

    return {
      phone: parsed.phone || "",
      email: parsed.email || "",
      applicationId: parsed.applicationId || "",
      crmApplicationId: parsed.crmApplicationId || "",
      loanId: parsed.loanId || "",
    };
  } catch {
    return null;
  }
};

const getRepaymentLoanIdForApplication = async (applicationId) => {
  if (!applicationId) return "";

  const details = await fetchCrmRepaymentDetails(applicationId).catch((error) => {
    logger.warn("CRM repayment loan id lookup failed:", {
      applicationId,
      message: error.message,
    });
    return null;
  });

  return details?.loan_id || "";
};

const resolveRepaymentContactFromCRM = async (data = {}) => {
  const mobile = normalizeMobile(data.mobile || data.phone);

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw createBadRequest("Enter your registered mobile number");
  }

  const crmDetails = await fetchCrmRepaymentDetails(mobile);

  if (!crmDetails) {
    const error = new Error("No active repayment found in CRM for this mobile number");
    error.statusCode = 404;
    throw error;
  }

  return {
    applicationId: crmDetails.application_id,
    crmApplicationId: crmDetails.application_id,
    loanId: crmDetails.loan_id,
    phone: crmDetails.mobile || mobile,
    email: crmDetails.crm_status?.email || "",
    name: crmDetails.full_name || crmDetails.crm_status?.customerName || "Customer",
    crmDetails,
  };
};

const resolveRepaymentContactFromPan = async (pan) => {
  const normalizedPan = String(pan || "").trim().toUpperCase();

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)) {
    throw createBadRequest("Enter a valid PAN number");
  }

  const contact = await getRepaymentContactByPan(normalizedPan);
  const mobile = normalizeMobile(contact.phone);

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw createBadRequest("Registered mobile number is not available for this PAN");
  }

  // PAN is used only to identify the registered contact. Repayment data must come from CRM by mobile.
  const crmDetails = await fetchCrmRepaymentDetails(mobile);

  if (!crmDetails) {
    const error = new Error("No active repayment found in CRM for this PAN");
    error.statusCode = 404;
    throw error;
  }

  return {
    applicationId: contact.applicationId,
    crmApplicationId: crmDetails.application_id,
    loanId: crmDetails.loan_id,
    phone: crmDetails.mobile || mobile,
    email: crmDetails.crm_status?.email || contact.email || "",
    name: crmDetails.full_name || crmDetails.crm_status?.customerName || "Customer",
    crmDetails,
  };
};

const createBadRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const getCashfreeCredentials = () => {
  const clientId = process.env.CASHFREE_CLIENT_ID || process.env.CASHFREE_APP_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY;

  if (!clientId || !clientSecret) {
    throw createBadRequest("Cashfree payment API is not configured");
  }

  const normalizedSecret = String(clientSecret).toLowerCase();

  if (CASHFREE_ENV === "sandbox" && normalizedSecret.includes("_prod_")) {
    throw createBadRequest("Cashfree sandbox mode needs sandbox/test credentials. Replace production CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET with sandbox keys.");
  }

  if (CASHFREE_ENV === "production" && normalizedSecret.includes("_test_")) {
    throw createBadRequest("Cashfree production mode needs production credentials. Replace sandbox CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET with production keys.");
  }

  return { clientId, clientSecret };
};

const getPublicClientBaseUrl = () =>
  (process.env.CLIENT_BASE_URL || "http://localhost:8080").replace(/\/$/, "");

const isHttpsUrl = (value) => /^https:\/\/[^/]+/i.test(String(value || ""));

const getOptionalHttpsUrl = (value) => {
  const url = String(value || "").trim();
  return isHttpsUrl(url) ? url : "";
};

const isLocalUrl = (value = "") => /localhost|127\.0\.0\.1|::1/i.test(String(value));

const getTrustedRequestOrigin = (req) => {
  const origin = String(req.headers.origin || "").trim().replace(/\/$/, "");
  const clientBaseUrl = getPublicClientBaseUrl();
  const cashfreeAllowedOrigins = String(process.env.CASHFREE_ALLOWED_ORIGIN || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const allowedOrigins = new Set(
    [
      ...DEFAULT_PAYMENT_ORIGINS,
      clientBaseUrl,
      ...cashfreeAllowedOrigins,
    ]
      .map((value) => String(value || "").trim().replace(/\/$/, ""))
      .filter(Boolean),
  );

  return isHttpsUrl(origin) && allowedOrigins.has(origin) ? origin : "";
};

const assertTrustedPaymentOrigin = (req) => {
  if (!isCashfreeProduction || process.env.NODE_ENV !== "production") return;

  const requestOrigin = String(req.headers.origin || "").trim().replace(/\/$/, "");

  if (!requestOrigin || isLocalUrl(requestOrigin) || !isHttpsUrl(requestOrigin)) {
    throw createBadRequest("Payment requests must come from the approved Waqt Money domain");
  }
};

const getCashfreeReturnUrl = (orderId, applicationId, req, loanId = "", mobile = "") => {
  const configuredReturnUrl = process.env.CASHFREE_RETURN_URL;
  const normalizedMobile = String(mobile || "").replace(/\D/g, "").slice(-10);

  if (configuredReturnUrl) {
    const trustedOrigin = getTrustedRequestOrigin(req);
    let returnUrl = configuredReturnUrl
      .replace("{order_id}", encodeURIComponent(orderId))
      .replace("{application_id}", encodeURIComponent(applicationId || ""))
      .replace("{loan_id}", encodeURIComponent(loanId || ""))
      .replace("{mobile}", encodeURIComponent(normalizedMobile || ""))
      .replace("{origin}", trustedOrigin || getPublicClientBaseUrl());

    if (normalizedMobile) {
      try {
        const parsedReturnUrl = new URL(returnUrl);
        if (applicationId) parsedReturnUrl.searchParams.set("application_id", applicationId);
        parsedReturnUrl.searchParams.set("mobile", normalizedMobile);
        if (loanId) parsedReturnUrl.searchParams.set("loan_id", loanId);
        returnUrl = parsedReturnUrl.toString();
      } catch {
        // Keep the configured URL if it is not parseable; validation below will catch invalid production URLs.
      }
    }

    if (isCashfreeProduction && !isHttpsUrl(returnUrl)) {
      throw createBadRequest("CASHFREE_RETURN_URL must be an https URL in production");
    }

    return returnUrl;
  }

  const clientBaseUrl = getTrustedRequestOrigin(req) || getPublicClientBaseUrl();

  if (isCashfreeProduction && !isHttpsUrl(clientBaseUrl)) {
    if (process.env.NODE_ENV === "production") {
      throw createBadRequest("CLIENT_BASE_URL must be an https URL for Cashfree production payments");
    }

    return "";
  }

  const params = new URLSearchParams({
    order_id: orderId,
  });
  if (applicationId) {
    params.set("application_id", String(applicationId));
  }
  if (normalizedMobile) {
    params.set("mobile", normalizedMobile);
  }
  if (loanId) {
    params.set("loan_id", loanId);
  }
  const returnUrl = `${clientBaseUrl}/repayment/make-payment?${params.toString()}`;

  return getOptionalHttpsUrl(returnUrl);
};

const normalizeAmount = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createBadRequest("Enter a valid payment amount");
  }

  return Number(numericAmount.toFixed(2));
};

const getCrmOutstandingAmount = (crmDetails = {}) => {
  const values = [
    crmDetails.outstanding_amount,
    crmDetails.outstandingAmount,
    crmDetails.maturity_amount,
    crmDetails.maturityAmount,
    crmDetails.crm_status?.repayment?.outstanding,
    crmDetails.crm_status?.repayment?.outstandingAmount,
    crmDetails.crm_status?.repayment?.outstanding_amount,
    crmDetails.crm_status?.repayment?.balanceAmount,
    crmDetails.crm_status?.repayment?.balance_amount,
    crmDetails.crm_status?.repayment?.dueAmount,
    crmDetails.crm_status?.repayment?.due_amount,
    crmDetails.crm_status?.repayment?.totalDue,
    crmDetails.crm_status?.repayment?.total_due,
  ];

  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) {
      return Number(amount.toFixed(2));
    }
  }

  const totalDue = Number(
    crmDetails.crm_status?.repayment?.totalDue ||
      crmDetails.crm_status?.repayment?.total_due ||
      0
  );
  const paidAmount = Number(
    crmDetails.repayment_paid_amount ||
      crmDetails.crm_status?.repayment?.amountPaid ||
      crmDetails.crm_status?.repayment?.amount_paid ||
      crmDetails.crm_status?.repayment?.paidAmount ||
      crmDetails.crm_status?.repayment?.paid_amount ||
      0
  );

  if (Number.isFinite(totalDue) && totalDue > 0) {
    return Math.max(0, Number((totalDue - (Number.isFinite(paidAmount) ? paidAmount : 0)).toFixed(2)));
  }

  return 0;
};

const calculateRepaymentOutstanding = (application) => {
  const loanAmount = Number(application?.loan_amount || 0);
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) return 0;

  const dailyInterestRate = Number(process.env.REPAYMENT_DAILY_INTEREST_RATE || 0.9);
  const tenureDays = Number(process.env.REPAYMENT_TENURE_DAYS || 32);
  const startDate = application?.submit_at ? new Date(application.submit_at) : new Date();
  const validStartDate = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
  const elapsedDays = Math.min(
    tenureDays,
    Math.max(1, Math.ceil((Date.now() - validStartDate.getTime()) / (1000 * 60 * 60 * 24)))
  );
  const interestAccrued = Number(((loanAmount * dailyInterestRate * elapsedDays) / 100).toFixed(2));
  const paidAmount = Number(application?.repayment_paid_amount || 0);

  return Math.max(0, Number((loanAmount + interestAccrued - paidAmount).toFixed(2)));
};

const ensureRepaymentColumns = async () => {
  const columns = [
    ["status", "VARCHAR(50) NULL"],
    ["repayment_status", "VARCHAR(50) NULL"],
    ["repayment_paid_amount", "DECIMAL(12,2) DEFAULT 0"],
    ["repayment_last_order_id", "VARCHAR(120) NULL"],
    ["repayment_last_paid_at", "DATETIME NULL"],
  ];
  const [existingColumns] = await db.execute(
    `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'waqt_money_loan_applications'`
  );
  const existingColumnsByName = new Map(
    existingColumns.map((column) => [column.COLUMN_NAME, column])
  );

  for (const [name, definition] of columns) {
    const existingColumn = existingColumnsByName.get(name);

    if (!existingColumn) {
      await db.execute(`ALTER TABLE waqt_money_loan_applications ADD COLUMN ${name} ${definition}`);
      continue;
    }

    const shouldWidenTextColumn =
      ["status", "repayment_status", "repayment_last_order_id"].includes(name) &&
      (String(existingColumn.DATA_TYPE).toLowerCase() !== "varchar" ||
        Number(existingColumn.CHARACTER_MAXIMUM_LENGTH || 0) < Number(definition.match(/\((\d+)\)/)?.[1] || 0));

    if (shouldWidenTextColumn) {
      await db.execute(`ALTER TABLE waqt_money_loan_applications MODIFY COLUMN ${name} ${definition}`);
    }
  }
};

const getApplicationIdFromCashfreeOrder = (order) => {
  const taggedApplicationId =
    order?.order_tags?.application_id ||
    order?.order_tags?.applicationId ||
    order?.order_meta?.application_id ||
    "";

  if (taggedApplicationId) return String(taggedApplicationId);

  const returnUrl =
    order?.order_meta?.return_url ||
    order?.order_meta?.returnUrl ||
    order?.return_url ||
    "";

  if (returnUrl) {
    try {
      const parsedReturnUrl = new URL(returnUrl);
      const returnedApplicationId = parsedReturnUrl.searchParams.get("application_id");

      if (returnedApplicationId) return returnedApplicationId;
    } catch {
      // Ignore malformed gateway metadata and fall back to the order id.
    }
  }

  const orderId = String(order?.order_id || "");
  const match = orderId.match(/^repay_(.+)_\d+$/);

  return match?.[1] || "";
};

const syncRepaymentToApplication = async (order) => {
  const orderStatus = String(order?.order_status || "").toUpperCase();
  if (orderStatus !== "PAID") return null;

  const applicationId = getApplicationIdFromCashfreeOrder(order);
  if (!applicationId) return null;

  const orderAmount = normalizeAmount(order.order_amount || 0);
  const paymentType = String(
    order?.order_tags?.payment_type ||
    (String(order?.order_note || "").toLowerCase().includes("part") ? "part" : "full")
  ).toLowerCase();
  const crmDetails = await fetchCrmRepaymentDetails(applicationId).catch((error) => {
    logger.warn("CRM repayment lookup before sync failed:", {
      applicationId,
      orderId: order.order_id,
      message: error.message,
    });
    return null;
  });
  const effectiveApplicationId = crmDetails?.application_id || applicationId;
  const application = await getApplicationById(effectiveApplicationId).catch((error) => {
    logger.warn("Local repayment application lookup failed:", {
      applicationId: effectiveApplicationId,
      orderId: order.order_id,
      message: error.message,
    });
    return null;
  });
  const outstandingBeforePayment =
    getCrmOutstandingAmount(crmDetails) || calculateRepaymentOutstanding(application || {});
  const isFullPayment = orderAmount >= Math.max(1, outstandingBeforePayment - 0.01);
  const nextStatus = isFullPayment ? "paid" : "approved";
  const nextRepaymentStatus = isFullPayment ? "paid" : "partial_paid";
  let result = { affectedRows: 0 };

  if (application) {
    await ensureRepaymentColumns();

    const lookup = String(effectiveApplicationId).trim();
    const [updateResult] = await db.execute(
      `UPDATE waqt_money_loan_applications
       SET status = ?,
           repayment_status = ?,
           repayment_paid_amount = COALESCE(repayment_paid_amount, 0) + ?,
           repayment_last_order_id = ?,
           repayment_last_paid_at = NOW(),
           current_step = CASE WHEN ? = 'paid' THEN 'loan_closed' ELSE current_step END,
           last_activity_at = NOW()
       WHERE (application_id = ? OR id = ?)
         AND (repayment_last_order_id IS NULL OR repayment_last_order_id <> ?)`,
      [
        nextStatus,
        nextRepaymentStatus,
        orderAmount,
        order.order_id || "",
        nextRepaymentStatus,
        lookup,
        /^\d+$/.test(lookup) ? Number(lookup) : 0,
        order.order_id || "",
      ]
    );
    result = updateResult;
  }

  const crmSync = await syncRepaymentToCRM({
    sourceLeadId: effectiveApplicationId,
    loanId:
      getRealLoanId(order?.order_tags?.loan_id) ||
      getRealLoanId(crmDetails?.loan_id) ||
      getRealLoanId(application?.loan_id) ||
      getRealLoanId(application?.crm_loan_id) ||
      order?.order_tags?.loan_id ||
      application?.application_id ||
      effectiveApplicationId,
    amount: orderAmount,
    method: order?.payment_method || order?.payment_group || order?.paymentMethod || "ONLINE",
    reference: order.order_id || order.cf_order_id || "",
    gateway: "cashfree",
    paidAt: order?.payment_time || order?.order_expiry_time || new Date().toISOString(),
    status: "success",
  }).catch((error) => {
    logger.error("CRM repayment sync failed:", {
      applicationId,
      orderId: order.order_id,
      message: error.message,
      statusCode: error.statusCode,
    });
    return null;
  });

  return {
    applicationId: effectiveApplicationId,
    requestedPaymentType: paymentType === "part" ? "part" : "full",
    paymentType: isFullPayment ? "full" : "part",
    repaymentStatus: nextRepaymentStatus,
    paidAmount: orderAmount,
    outstandingBeforePayment,
    outstandingAfterPayment: Math.max(0, Number((outstandingBeforePayment - orderAmount).toFixed(2))),
    updated: result.affectedRows > 0,
    crmSync,
  };
};

const buildCashfreeHeaders = () => {
  const { clientId, clientSecret } = getCashfreeCredentials();

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-version": CASHFREE_API_VERSION,
    "x-request-id": crypto.randomUUID(),
    "x-client-id": clientId,
    "x-client-secret": clientSecret,
  };
};

const readCashfreeResponse = async (response) => {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const fetchCashfree = async (path, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CASHFREE_TIMEOUT_MS);

  try {
    return await fetch(`${CASHFREE_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Cashfree API timeout. Please try again.");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const getCashfreeOrder = async (orderId) => {
  if (!orderId) throw createBadRequest("Order ID is required");

  const response = await fetchCashfree(`/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: buildCashfreeHeaders(),
  });
  const result = await readCashfreeResponse(response);

  if (!response.ok) {
    const error = new Error(result.message || result.error_description || result.error || "Unable to fetch payment status");
    error.statusCode = response.status;
    error.details = result;
    throw error;
  }

  return result;
};

export const sendRepaymentOtp = async (req, res, next) => {
  try {
    const contact = req.body.pan
      ? await resolveRepaymentContactFromPan(req.body.pan)
      : await resolveRepaymentContactFromCRM(req.body);
    const loanId = contact.loanId;
    const otpResult = await sendOTPService({
      phone: contact.phone,
      email: contact.email,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent",
      data: {
        applicationId: contact.applicationId,
        crmApplicationId: contact.crmApplicationId,
        loanId,
        mobile: contact.phone,
        maskedPhone: maskPhone(contact.phone),
        maskedEmail: maskEmail(contact.email),
        delivery: otpResult.delivery,
        channels: otpResult.channels,
        ttl: otpResult.ttl,
        ...(otpResult.debugOtp ? { debugOtp: otpResult.debugOtp } : {}),
        repaymentOtpToken: createRepaymentOtpToken({
          pan: req.body.pan || "",
          phone: contact.phone,
          email: contact.email,
          applicationId: contact.applicationId,
          crmApplicationId: contact.crmApplicationId,
          loanId,
        }),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyRepaymentOtp = async (req, res, next) => {
  try {
    const contactFromToken = getContactFromRepaymentOtpToken(req.body.repaymentOtpToken);
    const contact = contactFromToken?.applicationId
      ? contactFromToken
      : req.body.pan
        ? await resolveRepaymentContactFromPan(req.body.pan)
        : await resolveRepaymentContactFromCRM(req.body);
    const crmDetails = contact.loanId
      ? null
      : await fetchCrmRepaymentDetails(contact.phone).catch(() => null);
    const loanId = contact.loanId || crmDetails?.loan_id || await getRepaymentLoanIdForApplication(contact.applicationId);
    const crmApplicationId = contact.crmApplicationId || crmDetails?.application_id || "";
    const result = verifyOTPService({
      phone: contact.phone,
      email: contact.email,
      otp: req.body.otp,
    });

    if (result === true) {
      return res.status(200).json({
        success: true,
        message: "OTP Verified",
        data: {
          applicationId: contact.applicationId,
          crmApplicationId,
          loanId,
          mobile: contact.phone,
          repaymentAccessToken: createRepaymentAccessToken({
            pan: req.body.pan || "",
            applicationId: contact.applicationId,
            loanId,
          }),
        },
      });
    }

    if (result === "expired") {
      return res.status(400).json({ success: false, message: "OTP Expired" });
    }

    return res.status(400).json({ success: false, message: "Invalid OTP" });
  } catch (err) {
    next(err);
  }
};

export const createRepaymentPaymentOrder = async (req, res, next) => {
  try {
    assertTrustedPaymentOrigin(req);
    const applicationId = req.body.applicationId;
    const loanId = getRealLoanId(req.body.loanId || req.body.repaymentLoanId);
    const requestMobile = String(req.body.mobile || "").replace(/\D/g, "").slice(-10);
    const accessToken = req.body.repaymentAccessToken || req.headers["x-repayment-access-token"];

    if (!verifyRepaymentAccessToken(accessToken, applicationId, loanId)) {
      throw createBadRequest("Repayment session expired. Please verify OTP again.");
    }

    const requestedAmount = normalizeAmount(req.body.amount);
    const paymentType = req.body.paymentType === "part" ? "part" : "full";
    const crmDetails = await fetchCrmRepaymentDetails(requestMobile || applicationId || loanId);

    if (!crmDetails) {
      return res.status(404).json({
        success: false,
        message: "No active repayment found in CRM",
      });
    }

    const customerPhone = normalizeMobile(crmDetails.mobile || requestMobile);

    if (!/^[6-9]\d{9}$/.test(customerPhone)) {
      throw createBadRequest("Registered mobile number is required for payment");
    }

    const crmLoanId = getRealLoanId(crmDetails.loan_id) || loanId;
    const crmApplicationId = crmDetails.application_id || applicationId;
    const outstandingAmount = getCrmOutstandingAmount(crmDetails);

    if (!Number.isFinite(outstandingAmount) || outstandingAmount <= 0) {
      throw createBadRequest("No outstanding repayment amount is available for this loan");
    }

    if (paymentType === "part" && requestedAmount > outstandingAmount) {
      throw createBadRequest("Part payment amount cannot be more than outstanding amount");
    }

    const orderAmount = paymentType === "full" ? outstandingAmount : requestedAmount;
    const orderId = [
      "repay",
      String(crmLoanId || crmApplicationId || applicationId).replace(/[^a-zA-Z0-9_-]/g, ""),
      Date.now(),
    ].join("_");
    const returnUrl = getCashfreeReturnUrl(orderId, crmApplicationId, req, crmLoanId, customerPhone);
    const notifyUrl = getOptionalHttpsUrl(process.env.CASHFREE_NOTIFY_URL);
    const orderMeta = {
      ...(returnUrl ? { return_url: returnUrl } : {}),
      ...(notifyUrl ? { notify_url: notifyUrl } : {}),
    };

    const response = await fetchCashfree("/orders", {
      method: "POST",
      headers: {
        ...buildCashfreeHeaders(),
        "x-idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: "INR",
        customer_details: {
          customer_id: String(crmApplicationId || crmLoanId || customerPhone),
          customer_name: crmDetails.full_name || "Customer",
          customer_email: crmDetails.crm_status?.email || undefined,
          customer_phone: customerPhone,
        },
        order_meta: Object.keys(orderMeta).length ? orderMeta : undefined,
        order_note: `Waqt Money repayment ${paymentType} payment`,
        order_tags: {
          application_id: String(crmApplicationId || ""),
          loan_id: crmLoanId || "",
          payment_type: paymentType,
        },
      }),
    });

    const result = await readCashfreeResponse(response);

    if (!response.ok) {
      logger.error("Cashfree create order failed:", {
        status: response.status,
        orderId,
        applicationId,
        cashfreeMode: CASHFREE_ENV,
        result,
      });

      return res.status(response.status).json({
        success: false,
        message: result.message || result.error_description || result.error || "Unable to create payment order",
        ...(process.env.NODE_ENV === "production" ? {} : { data: result }),
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment order created",
      data: {
        orderId: result.order_id,
        cfOrderId: result.cf_order_id,
        paymentSessionId: result.payment_session_id,
        orderStatus: result.order_status,
        cashfreeMode: CASHFREE_ENV === "sandbox" ? "sandbox" : "production",
        hasReturnUrl: Boolean(returnUrl),
        returnUrl,
        orderAmount,
        outstandingAmount,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getRepaymentPaymentStatus = async (req, res, next) => {
  try {
    const order = await getCashfreeOrder(req.params.orderId || req.query.orderId);
    const repaymentSync = await syncRepaymentToApplication(order);

    res.status(200).json({
      success: true,
      message: "Payment status fetched",
      data: {
        orderId: order.order_id,
        cfOrderId: order.cf_order_id,
        orderStatus: order.order_status,
        orderAmount: order.order_amount,
        orderCurrency: order.order_currency,
        paymentSessionId: order.payment_session_id,
        repaymentSync,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateWorkDetailsApp = async (req, res, next) => {
  try {
    const { id, applicationId, ...data } = req.body;
    await updateWorkDetails(id || applicationId, data);

    res.status(200).json({
      success: true,
      message: "Work details saved",
      data: {
        nextPath: "/user/bank-details",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getIfscDetails = async (req, res, next) => {
  try {
    const data = await lookupIfsc(req.params.ifsc || req.query.ifsc);

    res.status(200).json({
      success: true,
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateBankDetailsApp = async (req, res, next) => {
  try {
    const { id, applicationId, ...data } = req.body;
    await updateBankDetails(id || applicationId, data);

    res.status(200).json({
      success: true,
      message: "Bank details saved",
      data: {
        nextPath: "/user/references",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateReferenceDetailsApp = async (req, res, next) => {
  try {
    const { id, applicationId, ...data } = req.body;
    await updateReferenceDetails(id || applicationId, data);

    res.status(200).json({
      success: true,
      message: "Reference details saved",
      data: {
        nextPath: "/user/salary-slip",
      },
    });
  } catch (err) {
    next(err);
  }
};
