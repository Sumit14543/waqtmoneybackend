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
import crypto from "crypto";
import { getAppSecret } from "../configs/secrets.js";
import logger from "../utils/logger.js";

const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || "2025-01-01";
const CASHFREE_ENV = (process.env.CASHFREE_ENV || "production").toLowerCase();
const CASHFREE_TIMEOUT_MS = Number(process.env.CASHFREE_API_TIMEOUT_MS || 8000);
const CASHFREE_BASE_URL =
  CASHFREE_ENV === "sandbox"
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";
const isCashfreeProduction = CASHFREE_ENV !== "sandbox";

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
      setTimeout(async () => {
        try {
          const application = await getApplicationById(id);
          if (application) {
            await syncLeadToCRM(application);
          }
        } catch (syncErr) {
          console.error("Background CRM sync error:", syncErr.message);
        }
      }, 2000);
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

    res.status(200).json({
      success: true,
      data: application,
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

const createRepaymentOtpToken = ({ pan, phone, email }) => {
  const payload = encodeBase64Url(JSON.stringify({
    pan: String(pan || "").trim().toUpperCase(),
    phone: phone || "",
    email: email || "",
    expires: Date.now() + 2 * 60 * 1000,
  }));
  const signature = signRepaymentOtpPayload(payload);

  return `${payload}.${signature}`;
};

const createRepaymentAccessToken = ({ pan, applicationId }) => {
  const payload = encodeBase64Url(JSON.stringify({
    pan: String(pan || "").trim().toUpperCase(),
    applicationId: String(applicationId || ""),
    purpose: "repayment",
    expires: Date.now() + 15 * 60 * 1000,
  }));
  const signature = signRepaymentOtpPayload(payload);

  return `${payload}.${signature}`;
};

const verifyRepaymentAccessToken = (token, applicationId) => {
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
      Date.now() <= Number(parsed.expires)
    );
  } catch {
    return false;
  }
};

const getContactFromRepaymentOtpToken = (token, pan) => {
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
    const normalizedPan = String(pan || "").trim().toUpperCase();

    if (parsed.pan !== normalizedPan || Date.now() > Number(parsed.expires)) {
      return null;
    }

    return {
      phone: parsed.phone || "",
      email: parsed.email || "",
    };
  } catch {
    return null;
  }
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
      clientBaseUrl,
      ...cashfreeAllowedOrigins,
    ]
      .map((value) => String(value || "").trim().replace(/\/$/, ""))
      .filter(Boolean),
  );

  return isHttpsUrl(origin) && allowedOrigins.has(origin) ? origin : "";
};

const assertTrustedPaymentOrigin = (req) => {
  if (!isCashfreeProduction) return;

  const requestOrigin = String(req.headers.origin || "").trim().replace(/\/$/, "");

  if (!requestOrigin || isLocalUrl(requestOrigin) || !getTrustedRequestOrigin(req)) {
    throw createBadRequest("Payment requests must come from the approved Waqt Money domain");
  }
};

const getCashfreeReturnUrl = (orderId, applicationId, req) => {
  const configuredReturnUrl = process.env.CASHFREE_RETURN_URL;

  if (configuredReturnUrl) {
    const trustedOrigin = getTrustedRequestOrigin(req);
    const returnUrl = configuredReturnUrl
      .replace("{order_id}", encodeURIComponent(orderId))
      .replace("{application_id}", encodeURIComponent(applicationId || ""))
      .replace("{origin}", trustedOrigin || getPublicClientBaseUrl());

    if (isCashfreeProduction && !isHttpsUrl(returnUrl)) {
      throw createBadRequest("CASHFREE_RETURN_URL must be an https URL in production");
    }

    return returnUrl;
  }

  const clientBaseUrl = getTrustedRequestOrigin(req) || getPublicClientBaseUrl();

  if (isCashfreeProduction && !isHttpsUrl(clientBaseUrl)) {
    throw createBadRequest("CLIENT_BASE_URL must be an https URL for Cashfree production payments");
  }

  const params = new URLSearchParams({
    order_id: orderId,
    application_id: String(applicationId || ""),
  });
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
    const contact = await getRepaymentContactByPan(req.body.pan);
    const otpResult = await sendOTPService({
      phone: contact.phone,
      email: contact.email,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent",
      data: {
        applicationId: contact.applicationId,
        maskedPhone: maskPhone(contact.phone),
        maskedEmail: maskEmail(contact.email),
        delivery: otpResult.delivery,
        channels: otpResult.channels,
        ttl: otpResult.ttl,
        ...(otpResult.debugOtp ? { debugOtp: otpResult.debugOtp } : {}),
        repaymentOtpToken: createRepaymentOtpToken({
          pan: req.body.pan,
          phone: contact.phone,
          email: contact.email,
        }),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyRepaymentOtp = async (req, res, next) => {
  try {
    const contactFromToken = getContactFromRepaymentOtpToken(
      req.body.repaymentOtpToken,
      req.body.pan
    );
    const contact = contactFromToken || await getRepaymentContactByPan(req.body.pan);
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
          repaymentAccessToken: createRepaymentAccessToken({
            pan: req.body.pan,
            applicationId: contact.applicationId,
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
    const accessToken = req.body.repaymentAccessToken || req.headers["x-repayment-access-token"];

    if (!verifyRepaymentAccessToken(accessToken, applicationId)) {
      throw createBadRequest("Repayment session expired. Please verify OTP again.");
    }

    const amount = normalizeAmount(req.body.amount);
    const paymentType = req.body.paymentType === "part" ? "part" : "full";
    const application = await getApplicationById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const orderId = [
      "repay",
      String(application.application_id || application.id || applicationId).replace(/[^a-zA-Z0-9_-]/g, ""),
      Date.now(),
    ].join("_");
    const customerPhone = String(application.mobile || "").replace(/\D/g, "").slice(-10);

    if (!/^[6-9]\d{9}$/.test(customerPhone)) {
      throw createBadRequest("Registered mobile number is required for payment");
    }

    const returnUrl = getCashfreeReturnUrl(orderId, applicationId, req);
    const notifyUrl = getOptionalHttpsUrl(process.env.CASHFREE_NOTIFY_URL);
    const orderMeta = {
      ...(returnUrl ? { return_url: returnUrl } : {}),
      ...(notifyUrl ? { notify_url: notifyUrl } : {}),
    };

    const response = await fetchCashfree("/orders", {
      method: "POST",
      headers: {
        ...buildCashfreeHeaders(),
        "x-idempotency-key": orderId,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: String(application.application_id || application.id || applicationId),
          customer_name: application.full_name || "Customer",
          customer_email: application.email || undefined,
          customer_phone: customerPhone,
        },
        order_meta: Object.keys(orderMeta).length ? orderMeta : undefined,
        order_note: `Waqt Money repayment ${paymentType} payment`,
        order_tags: {
          application_id: String(application.application_id || applicationId),
          payment_type: paymentType,
        },
      }),
    });

    const result = await readCashfreeResponse(response);

    if (!response.ok) {
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
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getRepaymentPaymentStatus = async (req, res, next) => {
  try {
    const order = await getCashfreeOrder(req.params.orderId || req.query.orderId);

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
