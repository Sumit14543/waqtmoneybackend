import db from "../configs/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getAppSecret, getJwtSecret } from "../configs/secrets.js";
import {
  CRM_API_BASE_URLS,
  CRM_SANCTION_PDF_API_URLS,
  CRM_STATUS_API_URLS,
} from "../configs/integrations.js";
import { sendOTPService, verifyOTPService } from "../services/otp.service.js";
import { fetchCrmRepaymentDetails } from "../services/repayment.service.js";
import { ACTIVE_APPLICATION_MESSAGE, checkActiveApplicationInCRM } from "../services/crm.service.js";
import { parseCookies } from "../utils/cookies.js";

const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const APPLICATION_TABLE = "waqt_money_loan_applications";
let usersTableReady = false;
const isProduction = () => process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
const getSafeErrorMessage = (err, fallback = "Something went wrong. Please try again shortly.") =>
  isProduction() && (err.statusCode || err.status || 500) >= 500
    ? fallback
    : err.message || fallback;

const isActiveApplicationError = (err) =>
  Number(err?.statusCode || err?.status) === 409 ||
  err?.message === ACTIVE_APPLICATION_MESSAGE;

const ensureDashboardApplicationColumns = async () => {
  const columns = [
    ["status", "VARCHAR(50) NULL"],
    ["repayment_status", "VARCHAR(50) NULL"],
    ["repayment_paid_amount", "DECIMAL(12,2) DEFAULT 0"],
    ["repayment_last_order_id", "VARCHAR(120) NULL"],
    ["repayment_last_paid_at", "DATETIME NULL"],
    ["lead_visible", "TINYINT(1) DEFAULT 0"],
    ["completed_at", "DATETIME NULL"],
  ];
  const [existingColumns] = await db.query(
    `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [APPLICATION_TABLE]
  );
  const existingColumnsByName = new Map(
    existingColumns.map((column) => [column.COLUMN_NAME, column])
  );

  for (const [name, definition] of columns) {
    const existingColumn = existingColumnsByName.get(name);

    if (!existingColumn) {
      await db.query(`ALTER TABLE ${APPLICATION_TABLE} ADD COLUMN ${name} ${definition}`);
      continue;
    }

    const shouldWidenTextColumn =
      ["status", "repayment_status", "repayment_last_order_id"].includes(name) &&
      (String(existingColumn.DATA_TYPE).toLowerCase() !== "varchar" ||
        Number(existingColumn.CHARACTER_MAXIMUM_LENGTH || 0) < Number(definition.match(/\((\d+)\)/)?.[1] || 0));

    if (shouldWidenTextColumn) {
      await db.query(`ALTER TABLE ${APPLICATION_TABLE} MODIFY COLUMN ${name} ${definition}`);
    }
  }
};

const buildApplicationLookup = (value) => {
  const lookupValue = String(value || "").trim();

  if (/^\d+$/.test(lookupValue)) {
    return {
      clause: "(application_id = ? OR id = ?)",
      values: [lookupValue, Number(lookupValue)],
    };
  }

  return {
    clause: "application_id = ?",
    values: [lookupValue],
  };
};

const createToken = (user) =>
  jwt.sign(
    { id: user.id, mobile: user.mobile },
    getJwtSecret(),
    { expiresIn: "7d" }
  );

const AUTH_COOKIE = "auth_token";
const AUTH_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REPAYMENT_ACCESS_COOKIE = "repayment_access_token";
const REPAYMENT_ACCESS_TTL_MS = 60 * 60 * 1000;
const encodeBase64Url = (value) => Buffer.from(value).toString("base64url");
const signRepaymentAccessPayload = (payload) =>
  crypto.createHmac("sha256", getAppSecret()).update(payload).digest("base64url");

const createRepaymentAccessToken = ({ applicationId, loanId = "", phone = "" }) => {
  const payload = encodeBase64Url(JSON.stringify({
    pan: "",
    applicationId: String(applicationId || ""),
    loanId: String(loanId || ""),
    phone: normalizeMobile(phone),
    purpose: "repayment",
    expires: Date.now() + REPAYMENT_ACCESS_TTL_MS,
  }));
  const signature = signRepaymentAccessPayload(payload);

  return `${payload}.${signature}`;
};

const setRepaymentAccessCookie = (res, token) => {
  res.cookie(REPAYMENT_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: REPAYMENT_ACCESS_TTL_MS,
    path: "/api/application/repayment",
  });
};

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: AUTH_COOKIE_TTL_MS,
    path: "/api/auth",
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/api/auth",
  });
};

const ensureUsersTable = async () => {
  if (!usersTableReady) {
    const [tables] = await db.query(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
       LIMIT 1`
    );

    if (tables.length === 0) {
      await db.query(`CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NULL,
        mobile VARCHAR(15) NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    }

    usersTableReady = true;
  }

  const [columns] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'mobile'`
  );

  if (columns.length === 0) {
    await db.query("ALTER TABLE users ADD COLUMN mobile VARCHAR(15) NULL AFTER email");
  }
};

const getBearerToken = (req) => {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
  return parseCookies(req)[AUTH_COOKIE] || "";
};

const getAuthenticatedUser = async (req) => {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const [rows] = await db.query(
      "SELECT id, name, email, mobile FROM users WHERE id = ? LIMIT 1",
      [decoded.id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
};

const findLatestApplicationByMobile = async (mobile) => {
  const [applications] = await db.query(
    `SELECT full_name, email, mobile
     FROM ${APPLICATION_TABLE}
     WHERE mobile = ? OR mobile = ? OR mobile = ?
     ORDER BY last_activity_at DESC, id DESC
     LIMIT 1`,
    [mobile, `91${mobile}`, `+91${mobile}`]
  );

  return applications[0] || null;
};

const findOrCreateOtpUser = async (mobile) => {
  await ensureUsersTable();

  const [existingUsers] = await db.query(
    "SELECT id, name, email, mobile FROM users WHERE mobile=? ORDER BY id DESC LIMIT 1",
    [mobile]
  );

  if (existingUsers.length > 0) {
    return existingUsers[0];
  }

  const application = await findLatestApplicationByMobile(mobile);
  const name = String(application?.full_name || "").trim() || "Customer";
  const email = String(application?.email || "").trim() || null;
  const randomPassword = await bcrypt.hash(`otp-login-${mobile}-${Date.now()}-${Math.random()}`, 10);
  const [result] = await db.query(
    "INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)",
    [name, email, mobile, randomPassword]
  );

  return {
    id: result.insertId,
    name,
    email,
    mobile,
  };
};

const formatStepLabel = (step) => {
  const currentStep = String(step || "").trim().toLowerCase();
  const labels = {
    basic_details: "Basic Details",
    loan_requirement: "Loan Requirement",
    pan_verify: "PAN Verification",
    aadhaar_verify: "Aadhaar Verification",
    aadhaar_callback: "Aadhaar Verification",
    react_aadhaar_verify: "Aadhaar Verification",
    react_aadhaar_callback: "Aadhaar Verification",
    work_details: "Work Details",
    bank_details: "Bank Details",
    references: "References",
    upload_docs: "Documents Upload",
    documents_uploaded: "Documents Uploaded",
    video_kyc_completed: "Application Submitted",
    loan_status: "Approved",
    loan_closed: "Closed",
  };

  return labels[currentStep] || (currentStep ? currentStep.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Started");
};

const formatLoanStatus = (application) => {
  const status = String(application.status || "").trim().toLowerCase();
  const repaymentStatus = String(application.repayment_status || "").trim().toLowerCase();

  if (["closed", "paid", "completed"].includes(status) || repaymentStatus === "paid") return "Closed";
  if (repaymentStatus === "partial_paid") return "Partially Paid";
  if (["rejected", "failed", "cancelled"].includes(status)) return "Rejected";
  if (status === "approved") return "Approved";
  if (status) return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  return formatStepLabel(application.current_step);
};

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const firstPositiveNumber = (...values) => {
  for (const value of values) {
    const number = toFiniteNumber(value);
    if (number > 0) return number;
  }

  return 0;
};

const getCrmRepaymentOutstanding = (crmStatus = {}) => {
  const repayment = crmStatus.repayment || {};
  const directOutstanding = firstPositiveNumber(repayment.balanceAmount);

  if (directOutstanding > 0) return directOutstanding;

  const totalDue = toFiniteNumber(repayment.totalAmount);
  const paidAmount = toFiniteNumber(repayment.paidAmount);

  return Math.max(0, Number((totalDue - paidAmount).toFixed(2)));
};

const getIntegrationApiKey = () =>
  process.env.INTEGRATION_API_KEYS ||
  process.env.INTEGRATION_API_KEY ||
  process.env.CRM_INTEGRATION_API_KEY ||
  "";

const buildIntegrationHeaders = () => {
  const apiKey = getIntegrationApiKey();
  const headers = {
    Accept: "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers["x-integration-api-key"] = apiKey;
  }

  return headers;
};

const fetchCrmLeadStatusBySourceId = async (sourceId) => {
  const apiKey = getIntegrationApiKey();
  if (!apiKey) {
    const error = new Error("CRM status API key is not configured");
    error.statusCode = 500;
    throw error;
  }

  let lastError;

  for (const endpointUrl of CRM_STATUS_API_URLS) {
    try {
      const url = new URL(endpointUrl);
      url.searchParams.set("sourceSystem", "waqtmoney");
      url.searchParams.set("sourceLeadId", sourceId);
      url.searchParams.set("sourceApplicationId", sourceId);

      const response = await fetch(url, {
        headers: buildIntegrationHeaders(),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        return data.data || null;
      }

      lastError = new Error(data.message || "Unable to fetch CRM status");
      lastError.statusCode = response.status;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const normalizeCrmStatusList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(Boolean);
  if (Array.isArray(data.leads)) return data.leads.filter(Boolean);
  if (Array.isArray(data.statuses)) return data.statuses.filter(Boolean);
  if (Array.isArray(data.items)) return data.items.filter(Boolean);
  if (Array.isArray(data.data)) return data.data.filter(Boolean);
  return [data];
};

const getCrmDisbursalDate = (crmStatus = {}) =>
  crmStatus.disbursement?.disbursedAt ||
  crmStatus.disbursement?.disbursalDate ||
  crmStatus.disbursement?.disbursementDate ||
  crmStatus.sanction?.disbursedAt ||
  crmStatus.sanction?.disbursalDate ||
  crmStatus.sanction?.disbursementDate ||
  crmStatus.disbursedAt ||
  crmStatus.disbursalDate ||
  crmStatus.disbursementDate ||
  "";

const getDashboardCrmStageKey = (crmStatus = {}) => {
  const repaymentStatus = String(
    crmStatus.repayment?.status ||
      crmStatus.repayment?.repaymentStatus ||
      crmStatus.repayment?.scheduleStatus ||
      ""
  ).toLowerCase();
  const disbursementStatus = String(crmStatus.disbursement?.status || "").toLowerCase();
  const crmStatusText = [
    crmStatus.currentStage,
    crmStatus.statusCode,
    crmStatus.publicStatus,
    crmStatus.crmStatus,
    crmStatus.statusTitle,
  ]
    .join(" ")
    .toLowerCase();
  const disbursedAmount = firstPositiveNumber(
    crmStatus.sanction?.disbursedAmount,
    crmStatus.disbursement?.disbursedAmount,
    crmStatus.disbursedAmount
  );
  const hasRepayment = Boolean(
    repaymentStatus ||
      firstPositiveNumber(crmStatus.repayment?.totalAmount, crmStatus.repayment?.balanceAmount, crmStatus.repayment?.paidAmount)
  );

  if (["paid", "closed", "completed", "complete"].includes(repaymentStatus)) {
    return "repayment_received";
  }

  if (
    hasRepayment ||
    disbursedAmount > 0 ||
    ["paid", "completed", "complete", "disbursed", "success", "successful"].includes(disbursementStatus) ||
    /\b(converted|disbursed|repayment|active)\b/.test(crmStatusText)
  ) {
    return "loan_disbursed";
  }

  if (/\b(account|disbursement|disbursal)\b/.test(crmStatusText)) {
    return "sent_to_accounts";
  }

  return String(crmStatus.currentStage || crmStatus.statusCode || crmStatus.publicStatus || crmStatus.crmStatus || "")
    .trim()
    .toLowerCase();
};

const getDashboardCrmPresentation = (crmStatus = {}) => {
  const stageKey = getDashboardCrmStageKey(crmStatus);

  if (stageKey === "repayment_received") {
    return {
      statusTitle: "Repayment received",
      statusDescription: "Your repayment has been received and your balance has been updated.",
      nextExpectedAction: crmStatus.nextExpectedAction || "",
      progressPercent: crmStatus.progressPercent,
    };
  }

  if (stageKey === "loan_disbursed") {
    return {
      statusTitle: "Loan disbursed",
      statusDescription: "Your loan has been disbursed and the repayment schedule is now active.",
      nextExpectedAction: crmStatus.nextExpectedAction || "",
      progressPercent: crmStatus.progressPercent,
    };
  }

  if (stageKey === "sent_to_accounts") {
    return {
      statusTitle: "Sent to accounts",
      statusDescription: "Your signed agreement has been received and the loan is queued for disbursement.",
      nextExpectedAction: crmStatus.nextExpectedAction || "",
      progressPercent: crmStatus.progressPercent,
    };
  }

  return {
    statusTitle: crmStatus.statusTitle,
    statusDescription: crmStatus.statusDescription,
    nextExpectedAction: crmStatus.nextExpectedAction,
    progressPercent: crmStatus.progressPercent,
  };
};

const withDashboardCrmStage = (crmStatus = null) => {
  if (!crmStatus) return null;
  const presentation = getDashboardCrmPresentation(crmStatus);

  return {
    ...crmStatus,
    dashboardCurrentStageKey: getDashboardCrmStageKey(crmStatus),
    dashboardStatusTitle: presentation.statusTitle,
    dashboardStatusDescription: presentation.statusDescription,
    dashboardNextExpectedAction: presentation.nextExpectedAction,
    dashboardProgressPercent: presentation.progressPercent,
  };
};

const getCrmSanctionPdfUrls = (crmStatus = {}, loanId = "") => {
  const sourceLeadId = crmStatus.sourceLeadId || crmStatus.sourceApplicationId || loanId;
  const rawPdfUrl = String(crmStatus.sanction?.pdfUrl || "");
  const generatedUrls = sourceLeadId
    ? CRM_SANCTION_PDF_API_URLS.map(
      (endpointUrl) => `${endpointUrl}?sourceSystem=waqtmoney&sourceLeadId=${encodeURIComponent(sourceLeadId)}`
    )
    : [];

  if (!rawPdfUrl) {
    return generatedUrls;
  }

  if (rawPdfUrl.startsWith("/api/integrations/")) {
    return CRM_API_BASE_URLS.map((baseUrl) => `${baseUrl}${rawPdfUrl}`);
  }

  const normalizedUrls = CRM_API_BASE_URLS.map((baseUrl) =>
    rawPdfUrl.replace(
      /^https:\/\/(?:www\.)?waqtmoney\.com\/api\/integrations\//i,
      `${baseUrl}/api/integrations/`
    )
  );

  return [...new Set([...normalizedUrls, ...generatedUrls])];
};

const fetchCrmSanctionPdf = async (crmStatus, loanId) => {
  const apiKey = getIntegrationApiKey();
  const pdfUrls = getCrmSanctionPdfUrls(crmStatus, loanId);
  if (!apiKey || !pdfUrls.length) return null;

  for (const pdfUrl of pdfUrls) {
    const response = await fetch(pdfUrl, {
      headers: buildIntegrationHeaders(),
    }).catch(() => null);
    const contentType = String(response?.headers?.get("content-type") || "");

    if (response?.ok && contentType.toLowerCase().includes("application/pdf")) {
      return Buffer.from(await response.arrayBuffer());
    }
  }

  return null;
};

const fetchCrmLeadStatusesByMobile = async (mobile) => {
  const apiKey = getIntegrationApiKey();
  if (!apiKey || !mobile) return [];

  let lastError;

  for (const endpointUrl of CRM_STATUS_API_URLS) {
    try {
      const url = new URL(endpointUrl);
      url.searchParams.set("sourceSystem", "waqtmoney");
      url.searchParams.set("mobile", mobile);

      const response = await fetch(url, {
        headers: buildIntegrationHeaders(),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        return normalizeCrmStatusList(data.data);
      }

      lastError = new Error(data.message || "Unable to fetch CRM status by mobile");
      lastError.statusCode = response.status;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const fetchCrmLeadStatus = async (sourceIds) => {
  const candidates = [...new Set(sourceIds.map((value) => String(value || "").trim()).filter(Boolean))];
  let lastError;

  for (const sourceId of candidates) {
    try {
      return await fetchCrmLeadStatusBySourceId(sourceId);
    } catch (error) {
      lastError = error;
      if (![404, 400].includes(Number(error.statusCode))) {
        throw error;
      }
    }
  }

  if (lastError) throw lastError;
  return null;
};

const parseSourcePayload = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
};

const getCrmCandidateIds = (application = {}) => {
  const sourcePayload = parseSourcePayload(application.source_payload);

  return [
    application.source_lead_id,
    application.source_application_id,
    application.external_application_id,
    sourcePayload.sourceLeadId,
    sourcePayload.source_lead_id,
    sourcePayload.sourceApplicationId,
    sourcePayload.source_application_id,
    sourcePayload.application_id,
    application.application_id,
    application.id,
  ];
};

const toDashboardLoan = (loan, crmStatus = null) => {
  const dashboardCrmStatus = withDashboardCrmStage(crmStatus);
  const crmLoanAmount = Number(crmStatus?.loanAmount || 0);
  const crmRepaymentLoanAmount = Number(crmStatus?.repayment?.loanAmount || crmStatus?.repayment?.loan_amount || 0);
  const amount = firstPositiveNumber(crmRepaymentLoanAmount, crmLoanAmount);
  const sanction = crmStatus?.sanction || {};
  const repayment = crmStatus?.repayment || {};
  const approvedLoanAmount = firstPositiveNumber(
    repayment.loanAmount,
    repayment.loan_amount,
    sanction.principalAmount,
    sanction.approvedLoanAmount,
    sanction.approvedAmount,
    sanction.sanctionedAmount,
    crmStatus?.approvedLoanAmount,
    crmStatus?.approvedAmount,
    crmStatus?.sanctionedAmount
  );
  const crmOutstandingAmount = firstPositiveNumber(
    repayment.balanceAmount,
    repayment.balance_amount,
    repayment.outstandingAmount,
    repayment.outstanding_amount,
    repayment.nextPaymentAmount,
    repayment.next_payment_amount,
    getCrmRepaymentOutstanding(crmStatus || {})
  );
  const repaymentAmount = Math.round(crmOutstandingAmount);
  const paidAmount = firstPositiveNumber(
    repayment.paidAmount,
    repayment.paid_amount,
    repayment.amountPaid,
    repayment.amount_paid
  );
  const totalRepayableAmount = firstPositiveNumber(
    repayment.totalAmount,
    repayment.total_amount,
    repayment.totalDue,
    repayment.total_due,
    repayment.maturityAmount,
    repayment.maturity_amount
  );
  const dueDate =
    repayment.repaymentDueDate ||
    repayment.repayment_due_date ||
    repayment.dueDate ||
    repayment.due_date ||
    "";

  const applicationId =
    crmStatus?.sourceLeadId ||
    crmStatus?.sourceApplicationId ||
    crmStatus?.applicationId ||
    "";
  const loanId =
    repayment.loanId ||
    repayment.loan_id ||
    crmStatus?.loanId ||
    crmStatus?.loan_id ||
    sanction.loanId ||
    sanction.loan_id ||
    sanction.agreementNumber ||
    "";

  return {
    id: applicationId,
    loanId,
    mobile: normalizeMobile(crmStatus?.phone || loan.mobile),
    crmApplicationId: crmStatus?.applicationId || "",
    crmLeadId: crmStatus?.crmLeadId || "",
    status: crmStatus?.publicStatus || crmStatus?.crmStatus || repayment.status || repayment.repaymentStatus || "",
    currentStep: crmStatus?.statusTitle || crmStatus?.currentStage || "",
    amount: Number.isFinite(amount) ? amount : 0,
    requestedLoanAmount: firstPositiveNumber(crmLoanAmount, crmRepaymentLoanAmount),
    approvedLoanAmount,
    totalRepayableAmount,
    outstandingAmount: repaymentAmount,
    repaymentAmount,
    paidAmount,
    dueDate,
    tenureDays: firstPositiveNumber(
      repayment.tenureDays,
      repayment.tenure_days,
      repayment.tenure,
      sanction.tenureDays,
      sanction.tenure_days,
      sanction.tenure,
      crmStatus?.tenureDays,
      crmStatus?.tenure_days,
      crmStatus?.tenure
    ) || "",
    interestRate: firstPositiveNumber(
      repayment.interestRate,
      repayment.interest_rate,
      sanction.interestRate,
      sanction.interest_rate,
      crmStatus?.interestRate,
      crmStatus?.interest_rate
    ) || "",
    interestAccrued: firstPositiveNumber(
      repayment.interestAccrued,
      repayment.interest_accrued,
      sanction.interestAccrued,
      sanction.interest_accrued,
      crmStatus?.interestAccrued,
      crmStatus?.interest_accrued
    ) || "",
    disbursalDate: getCrmDisbursalDate(crmStatus) || loan.disbursal_date || "",
    crmRepaymentDetails: null,
    crmStatus: dashboardCrmStatus,
  };
};

export const signup = async (req, res) => {
  try {
    await ensureUsersTable();

    const { name, email, password } = req.body;
    const mobile = normalizeMobile(req.body.mobile || req.body.phone);

    if (!name || !password || !/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        message: "Name, valid mobile number, and password are required",
      });
    }

    try {
      await checkActiveApplicationInCRM({
        name,
        fullName: name,
        full_name: name,
        email,
        mobile,
        phone: mobile,
        sourceSystem: "waqtmoney",
        source: "waqtmoney",
        loanType: "payday",
        loan_type: "payday",
      });
    } catch (err) {
      if (isActiveApplicationError(err)) {
        return res.status(409).json({
          success: false,
          message: err.message || ACTIVE_APPLICATION_MESSAGE,
        });
      }

      throw err;
    }

    const [existingUsers] = await db.query("SELECT * FROM users WHERE mobile=?", [mobile]);
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This mobile number already has an account. Please login to continue.",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)",
      [name, email || null, mobile, hashed]
    );

    const user = {
      id: result.insertId,
      name,
      email: email || null,
      mobile,
    };

    const token = createToken(user);
    setAuthCookie(res, token);

    res.json({
      message: "Signup successful",
      authenticated: true,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: getSafeErrorMessage(err) });
  }
};

export const login = async (req, res) => {
  try {
    await ensureUsersTable();

    const { password } = req.body;
    const mobile = normalizeMobile(req.body.mobile || req.body.phone);

    if (!/^[6-9]\d{9}$/.test(mobile) || !password) {
      return res.status(400).json({
        message: "Valid mobile number and password are required",
      });
    }

    const [user] = await db.query("SELECT * FROM users WHERE mobile=?", [mobile]);
    if (user.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user[0].password);
    if (!valid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = createToken(user[0]);
    setAuthCookie(res, token);

    res.json({
      message: "Login success",
      authenticated: true,
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        mobile: user[0].mobile,
      },
    });
  } catch (err) {
    res.status(500).json({ error: getSafeErrorMessage(err) });
  }
};

export const sendLoginOtp = async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body.mobile || req.body.phone);
    console.log("Login OTP request received", { hasMobile: Boolean(mobile) });

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit mobile number",
      });
    }

    const result = await sendOTPService({ phone: mobile });
    console.log("Login OTP request completed", { channels: result.channels });
    return res.status(200).json({
      success: true,
      message: "OTP sent",
      data: result,
    });
  } catch (err) {
    if (err.statusCode === 429) {
      return res.status(429).json({ success: false, message: err.message });
    }
    if (err.details) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
        details: err.details,
      });
    }
    return next(err);
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const mobile = normalizeMobile(req.body.mobile || req.body.phone);
    const otp = String(req.body.otp || "").trim();

    if (!/^[6-9]\d{9}$/.test(mobile) || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile number and OTP are required",
      });
    }

    const otpResult = verifyOTPService({ phone: mobile, otp });

    if (otpResult === "expired") {
      return res.status(400).json({ success: false, message: "OTP Expired" });
    }

    if (otpResult !== true) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const user = await findOrCreateOtpUser(mobile);

    const token = createToken(user);
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: "Login success",
      authenticated: true,
      user,
    });
  } catch (err) {
    return res.status(500).json({ error: getSafeErrorMessage(err) });
  }
};

export const logout = async (req, res) => {
  clearAuthCookie(res);
  return res.json({
    success: true,
    message: "Logged out",
  });
};

export const dashboard = async (req, res) => {
  try {
    await ensureUsersTable();

    if (!getBearerToken(req)) {
      return res.status(401).json({ message: "Please login again" });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Session expired. Please login again" });
    }

    await ensureDashboardApplicationColumns();

    const [loans] = await db.query(
      `SELECT *
       FROM ${APPLICATION_TABLE}
       WHERE (mobile = ? OR mobile = ? OR mobile = ?)
         AND (lead_visible = 1 OR current_step = 'video_kyc_completed')
       ORDER BY last_activity_at DESC, id DESC`,
      [user.mobile, `91${user.mobile}`, `+91${user.mobile}`]
    );

    const crmLoansByMobile = await fetchCrmLeadStatusesByMobile(user.mobile).catch(() => []);
    let formattedLoans = crmLoansByMobile.length
      ? await Promise.all(
        crmLoansByMobile.map(async (crmStatus) => {
          return toDashboardLoan({}, crmStatus);
        })
      )
      : (
        await Promise.all(
          loans.map(async (loan) => {
            const crmStatus = await fetchCrmLeadStatus(getCrmCandidateIds(loan)).catch(() => null);
            if (!crmStatus) return null;

            return toDashboardLoan(loan, crmStatus);
          })
        )
      ).filter(Boolean);
    const latestLoan = formattedLoans[0] || null;
    const latestCrmStatus = latestLoan?.crmStatus || null;

    res.json({
      success: true,
      user,
      data: {
        user,
        credit: {
          score: latestCrmStatus?.cibilScore ?? null,
          label: "",
          message:
            latestCrmStatus?.statusDescription ||
            (latestLoan
              ? "Your application is under process."
              : "Start an application and it will appear here automatically."),
        },
        loans: formattedLoans,
      },
    });
  } catch (err) {
    res.status(500).json({ error: getSafeErrorMessage(err) });
  }
};

export const createDashboardRepaymentSession = async (req, res) => {
  try {
    await ensureUsersTable();

    if (!getBearerToken(req)) {
      return res.status(401).json({ message: "Please login again" });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Session expired. Please login again" });
    }

    const requestedApplicationId = String(req.body.applicationId || req.body.loanId || "").trim();
    const requestedLoanId = String(req.body.crmLoanId || req.body.loanId || "").trim();
    const requestedMobile = normalizeMobile(req.body.mobile);
    let ownedApplication = null;

    if (requestedApplicationId) {
      const lookup = buildApplicationLookup(requestedApplicationId);
      const [applications] = await db.query(
        `SELECT application_id, mobile
         FROM ${APPLICATION_TABLE}
         WHERE ${lookup.clause}
           AND (mobile = ? OR mobile = ? OR mobile = ?)
         LIMIT 1`,
        [...lookup.values, user.mobile, `91${user.mobile}`, `+91${user.mobile}`]
      );

      ownedApplication = applications[0] || null;
    }

    const identifiers = [
      requestedApplicationId,
      requestedLoanId,
      requestedMobile,
      user.mobile,
    ].filter(Boolean);

    let crmDetails = null;
    for (const identifier of identifiers) {
      crmDetails = await fetchCrmRepaymentDetails(identifier).catch(() => null);
      if (crmDetails) break;
    }

    if (!crmDetails) {
      return res.status(404).json({
        success: false,
        message: "No active repayment found for this account",
      });
    }

    const crmPhone = normalizeMobile(crmDetails.mobile || crmDetails.crm_status?.phone);
    if (crmPhone !== user.mobile && !ownedApplication) {
      return res.status(403).json({
        success: false,
        message: "This repayment does not belong to your logged-in account",
      });
    }

    const applicationId = crmDetails.application_id || requestedApplicationId;
    const loanId = crmDetails.loan_id || requestedLoanId;
    const repaymentAccessToken = createRepaymentAccessToken({
      applicationId,
      loanId,
      phone: crmPhone || user.mobile,
    });

    setRepaymentAccessCookie(res, repaymentAccessToken);

    return res.json({
      success: true,
      message: "Repayment session created",
      data: {
        applicationId,
        loanId,
        mobile: crmPhone || user.mobile,
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: getSafeErrorMessage(err),
    });
  }
};

export const downloadSanctionLetter = async (req, res) => {
  try {
    await ensureUsersTable();

    if (!getBearerToken(req)) {
      return res.status(401).json({ message: "Please login again" });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Session expired. Please login again" });
    }

    const loanId = String(req.params.loanId || "").trim();
    if (!loanId) {
      return res.status(400).json({ message: "Loan ID is required" });
    }

    const lookup = buildApplicationLookup(loanId);
    const [applications] = await db.query(
      `SELECT *
       FROM ${APPLICATION_TABLE}
       WHERE ${lookup.clause}
         AND (mobile = ? OR mobile = ? OR mobile = ?)
       LIMIT 1`,
      [...lookup.values, user.mobile, `91${user.mobile}`, `+91${user.mobile}`]
    );

    const application = applications[0];
    const crmStatus = await fetchCrmLeadStatus(
      application ? getCrmCandidateIds(application) : [loanId]
    ).catch(() => null);
    const crmPhone = normalizeMobile(crmStatus?.phone);

    if (crmStatus && (!crmPhone || crmPhone === user.mobile)) {
      const crmPdf = await fetchCrmSanctionPdf(crmStatus, loanId).catch(() => null);

      if (crmPdf) {
        const filename = `WaqtMoney-Sanction-Letter-${crmStatus.sourceLeadId || crmStatus.applicationId || loanId}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", crmPdf.length);
        return res.send(crmPdf);
      }
    }

    return res.status(404).json({ message: "CRM sanction letter is not available" });
  } catch (err) {
    return res.status(500).json({ error: getSafeErrorMessage(err) });
  }
};

export const crmLeadStatus = async (req, res) => {
  try {
    await ensureUsersTable();

    if (!getBearerToken(req)) {
      return res.status(401).json({ message: "Please login again" });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Session expired. Please login again" });
    }

    const loanId = String(req.params.loanId || "").trim();
    if (!loanId) {
      return res.status(400).json({ message: "Loan ID is required" });
    }

    const lookup = buildApplicationLookup(loanId);
    const [applications] = await db.query(
      `SELECT *
       FROM ${APPLICATION_TABLE}
       WHERE ${lookup.clause}
         AND (mobile = ? OR mobile = ? OR mobile = ?)
       LIMIT 1`,
      [...lookup.values, user.mobile, `91${user.mobile}`, `+91${user.mobile}`]
    );

    if (!applications[0]) {
      return res.status(404).json({ message: "Loan application not found" });
    }

    const application = applications[0];
    const crmStatus = await fetchCrmLeadStatus([
      loanId,
      application.application_id,
      application.source_lead_id,
      application.source_application_id,
      application.external_application_id,
      application.id,
    ]);

    return res.json({
      success: true,
      data: crmStatus,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: getSafeErrorMessage(err),
    });
  }
};
