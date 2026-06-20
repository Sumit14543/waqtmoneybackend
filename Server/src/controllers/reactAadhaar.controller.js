import crypto from "crypto";
import db from "../configs/db.js";
import logger from "../utils/logger.js";

const APPLICATION_TABLE = "waqt_money_loan_applications";
const DIGITAP_BASE_URL = String(process.env.DIGITAP_BASE_URL || "https://apidemo.digitap.work").replace(/\/$/, "");
const API_PUBLIC_BASE_URL = String(process.env.API_PUBLIC_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");
const AADHAAR_CALLBACK_URL =
  process.env.DIGITAP_AADHAAR_CALLBACK_URL || `${API_PUBLIC_BASE_URL}/react-aadhaar/callback`;
const AADHAAR_CLIENT_BASE_URL = String(process.env.CLIENT_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const getCallbackClientBaseUrl = (req) => {
  try {
    const origin = req && (req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null));
    return (process.env.CLIENT_BASE_URL || origin || AADHAAR_CLIENT_BASE_URL).replace(/\/$/, "");
  } catch {
    return AADHAAR_CLIENT_BASE_URL;
  }
};
const SUCCESS_REDIRECT_PATH = "/user/work-details";
const DIGITAP_GENERATE_URL_PATH = "/ent/v1/kyc/generate-url";
const DIGITAP_DETAILS_PATH = "/ent/v1/kyc/get-digilocker-details";
const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const buildApplicationLookup = (value) => {
  const lookupValue = String(value || "").trim();

  if (/^\d+$/.test(lookupValue)) {
    return {
      clause: "(id = ? OR application_id = ?)",
      values: [Number(lookupValue), lookupValue],
    };
  }

  return {
    clause: "application_id = ?",
    values: [lookupValue],
  };
};

const encryptData = (value) => {
  const secret = process.env.APP_SECRET_KEY || process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error("APP_SECRET_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.createHash("sha256").update(secret).digest("hex").slice(0, 16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return encrypted.toString("base64");
};

const ensureApplicationColumns = async () => {
  const [existingColumns] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [APPLICATION_TABLE]
  );

  const existingNames = new Set(existingColumns.map((column) => column.COLUMN_NAME));
  const columns = [
    ["aadhaar_number", "TEXT NULL"],
    ["aadhaar_masked", "VARCHAR(20) NULL"],
    ["aadhaar_verified", "TINYINT(1) DEFAULT 0"],
    ["aadhaar_unique_id", "TEXT NULL"],
    ["aadhaar_reference_id", "VARCHAR(160) NULL"],
    ["lead_visible", "TINYINT(1) DEFAULT 0"],
    ["completed_at", "DATETIME NULL"],
  ];

  for (const [name, definition] of columns) {
    if (!existingNames.has(name)) {
      await db.execute(`ALTER TABLE ${APPLICATION_TABLE} ADD COLUMN ${name} ${definition}`);
    }
  }
};

const getDigitapAuthorization = () => {
  const clientId = String(process.env.DIGITAP_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.DIGITAP_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    const error = new Error("Digitap client credentials are not configured");
    error.statusCode = 500;
    throw error;
  }

  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
};

const sanitizeRedirectPath = (value, fallback = SUCCESS_REDIRECT_PATH) => {
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
};

const getSuccessRedirectPath = (req) =>
  sanitizeRedirectPath(req.aadhaarSuccessRedirectPath || process.env.REACT_AADHAAR_SUCCESS_REDIRECT_PATH);

const getFailureRedirectPath = (req) =>
  sanitizeRedirectPath(req.aadhaarFailureRedirectPath || process.env.REACT_AADHAAR_FAILURE_REDIRECT_PATH, "/user/kyc-aadhaar");

const getDigitapCallbackUrl = () => AADHAAR_CALLBACK_URL;

const readJsonResponse = async (response, serviceName) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : { statusCode: response.status };
  } catch {
    const error = new Error(`${serviceName} returned an invalid response`);
    error.statusCode = 502;
    throw error;
  }
};

const throwDigitapError = (data, fallbackMessage, statusCode = 502) => {
  const message = data?.msg || data?.message || data?.errorMessage || data?.error;
  const error = new Error(message || fallbackMessage);
  error.statusCode = statusCode;
  error.details = data;
  throw error;
};

const callDigitap = async (path, payload, serviceName, authorizationHeader = "Authorization") => {
  const response = await fetch(`${DIGITAP_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [authorizationHeader]: getDigitapAuthorization(),
    },
    body: JSON.stringify(payload),
  });
  const data = await readJsonResponse(response, serviceName);
  const responseCode = String(data?.code || "");

  if (!response.ok || (responseCode && responseCode !== "200") || data?.error === true) {
    throwDigitapError(data, `${serviceName} rejected the request`, response.status);
  }

  return data;
};
const unwrapDigitapModel = (response) => response?.model || response?.data || response || {};

const parseDigitapStartResponse = (response) => {
  const model = unwrapDigitapModel(response);
  return {
    transactionId: String(model.transactionId || model.txnId || response?.transactionId || response?.txnId || ""),
    authorizationUrl: String(model.kycUrl || model.url || response?.kycUrl || response?.url || ""),
  };
};
const normalizeAadhaarMask = (value, aadhaar) => {
  const raw = String(value || "").replace(/\s/g, "");
  if (/\d{4}$/.test(raw)) return `XXXXXXXX${raw.slice(-4)}`;

  const aadhaarDigits = String(aadhaar || "").replace(/\D/g, "");
  return aadhaarDigits.length === 12 ? `XXXXXXXX${aadhaarDigits.slice(-4)}` : "";
};

const normalizeDob = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
};

const getCallbackIdentifier = (query, keys) => {
  for (const key of keys) {
    const value = query?.[key];
    if (Array.isArray(value) && value[0]) return String(value[0]);
    if (value) return String(value);
  }
  return "";
};

const summarizeCallbackPayload = (payload) => ({
  keys: Object.keys(payload || {}).sort(),
  hasData: Boolean(payload?.data),
  hasTransactionId: Boolean(
    payload?.txnId ||
      payload?.transactionId ||
      payload?.transaction_id ||
      payload?.referenceId ||
      payload?.reference_id
  ),
  status: String(payload?.status || payload?.success || "").slice(0, 40),
  hasError: Boolean(payload?.error || payload?.error_code || payload?.errorCode),
});

const redirectAadhaarFailure = (req, res, reason) =>
  res.redirect(
    `${getCallbackClientBaseUrl(req)}${getFailureRedirectPath(req)}?aadhaar=failed&reason=${encodeURIComponent(reason)}`
  );

const getCallbackPayload = (req) => ({
  ...(req.query || {}),
  ...(req.body && typeof req.body === "object" ? req.body : {}),
});

const fetchDigitapAadhaarData = async (transactionId) => {
  const normalizedTransactionId = String(transactionId || "").trim();
  if (!normalizedTransactionId) throw badRequest("Digitap transaction ID is missing");

  const response = await callDigitap(
    DIGITAP_DETAILS_PATH,
    { transactionId: normalizedTransactionId },
    "Digitap DigiLocker details",
    "ent_authorization"
  );
  return unwrapDigitapModel(response);
};
const markAadhaarVerified = async (application, details = {}) => {
  const masked = normalizeAadhaarMask(
    details.maskedAdharNumber ||
      details.maskedAadhaar ||
      details.masked_aadhaar ||
      details.aadhaar ||
      details.uid,
    application.aadhaar_masked
  );
  const dob = normalizeDob(details.dob || details.dateOfBirth);
  const address = details.address || {};
  const city = address.vtc || address.dist || address.po || "";
  const pincode = String(address.pc || address.pincode || "").replace(/\D/g, "").slice(0, 6);

  await db.execute(
    `UPDATE ${APPLICATION_TABLE}
     SET aadhaar_verified = 1,
         aadhaar_masked = ?,
         full_name = COALESCE(NULLIF(full_name, ''), ?),
         dob = COALESCE(dob, ?),
         city = COALESCE(NULLIF(city, ''), ?),
         pincode = COALESCE(NULLIF(pincode, ''), ?),
         current_step = 'work_details',
         last_activity_at = NOW()
     WHERE id = ?`,
    [
      masked || application.aadhaar_masked || "",
      details.name || details.fullName || null,
      dob,
      city || null,
      pincode || null,
      application.id,
    ]
  );

  return masked || application.aadhaar_masked || "";
};

export const startReactAadhaarVerification = async (req, res, next) => {
  try {
    const applicationId = req.body.applicationId || req.body.id;
    const aadhaar = String(req.body.aadhaar || "").replace(/\D/g, "");

    if (!applicationId) throw badRequest("Application session not found. Please start again.");
    if (!/^\d{12}$/.test(aadhaar)) throw badRequest("Invalid Aadhaar number");

    await ensureApplicationColumns();

    const masked = `XXXXXXXX${aadhaar.slice(-4)}`;
    const encryptedAadhaar = encryptData(aadhaar);
    const lookup = buildApplicationLookup(applicationId);
    const [rows] = await db.execute(
      `SELECT id, application_id, full_name, mobile, email
       FROM ${APPLICATION_TABLE}
       WHERE ${lookup.clause}
       LIMIT 1`,
      lookup.values
    );
    const application = rows[0];
    if (!application) throw badRequest("Application not found");

    const uniqueId = `${application.application_id || applicationId}-${Date.now()}`
      .replace(/[^\w.@-]/g, "")
      .slice(0, 80);
    const nameParts = String(application.full_name || "Customer").trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || "Customer";
    const lastName = nameParts.join(" ");
    const mobile = String(application.mobile || "").replace(/\D/g, "").slice(-10);
    const emailId = String(application.email || "").trim();

    if (!/^[6-9]\d{9}$/.test(mobile) && !emailId) {
      throw badRequest("A valid mobile number or email is required for DigiLocker");
    }

    const digitapPayload = {
      serviceId: "4",
      uid: uniqueId,
      firstName,
      lastName,
      isSendOtp: true,
      isHideExplanationScreen: false,
      redirectionUrl: getDigitapCallbackUrl(),
    };
    if (/^[6-9]\d{9}$/.test(mobile)) digitapPayload.mobile = mobile;
    if (emailId) digitapPayload.emailId = emailId;

    const verification = await callDigitap(
      DIGITAP_GENERATE_URL_PATH,
      digitapPayload,
      "Digitap DigiLocker URL generation"
    );
    const { transactionId, authorizationUrl } = parseDigitapStartResponse(verification);
    if (!transactionId || !authorizationUrl) {
      throwDigitapError(verification, "Digitap did not return a transaction ID and DigiLocker URL");
    }

    const [updateResult] = await db.execute(
      `UPDATE ${APPLICATION_TABLE}
       SET aadhaar_number = ?,
           aadhaar_masked = ?,
           aadhaar_verified = 0,
           aadhaar_unique_id = ?,
           aadhaar_reference_id = ?,
           current_step = 'react_aadhaar_callback',
           last_activity_at = NOW()
       WHERE ${lookup.clause}`,
      [encryptedAadhaar, masked, uniqueId, transactionId, ...lookup.values]
    );
    if (updateResult.affectedRows === 0) throw badRequest("Application not found");

    return res.json({
      success: true,
      status: "pending",
      message: "Aadhaar DigiLocker verification started",
      data: {
        aadhaarMasked: masked,
        uniqueId,
        referenceId: transactionId,
        transactionId,
        callbackUrl: getDigitapCallbackUrl(),
        authorizationUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const handleReactAadhaarCallback = async (req, res) => {
  const isWebhook = req.method === "POST";
  const fail = (reason) => isWebhook
    ? res.status(200).json({ success: true, status: "received", verificationStatus: "failed" })
    : redirectAadhaarFailure(req, res, reason);

  try {
    const callbackPayload = getCallbackPayload(req);
    logger.info("Digitap Aadhaar callback received:", summarizeCallbackPayload(callbackPayload));

    const transactionId = getCallbackIdentifier(callbackPayload, [
      "txnId", "transactionId", "transaction_id", "referenceId", "reference_id",
    ]);
    const payloadUniqueId = getCallbackIdentifier(callbackPayload, [
      "uniqueId", "unique_id", "uid", "applicationNo", "application_id",
    ]);
    const successValue = String(callbackPayload.success ?? callbackPayload.status ?? "").toLowerCase();
    const isExplicitFailure = Boolean(callbackPayload.error_code || callbackPayload.errorCode) ||
      ["false", "failed", "failure", "error", "cancelled", "canceled"].includes(successValue);

    if (isExplicitFailure) return fail("provider_failed");
    if (!transactionId && !payloadUniqueId) return fail("missing_identifier");

    await ensureApplicationColumns();

    let details = callbackPayload.data && typeof callbackPayload.data === "object"
      ? callbackPayload.data
      : null;
    if (!details && transactionId) {
      details = await fetchDigitapAadhaarData(transactionId);
    }

    const resolvedUniqueId = String(payloadUniqueId || details?.uniqueId || "").trim();
    const [rows] = await db.execute(
      `SELECT id, aadhaar_masked, aadhaar_unique_id, aadhaar_reference_id
       FROM ${APPLICATION_TABLE}
       WHERE aadhaar_unique_id IN (?, ?)
          OR aadhaar_reference_id IN (?, ?)
       LIMIT 1`,
      [resolvedUniqueId, transactionId, resolvedUniqueId, transactionId]
    );
    const application = rows[0];
    if (!application) return fail("session_not_found");
    if (!details) return fail("provider_data_unavailable");

    await markAadhaarVerified(application, details);
    if (transactionId && transactionId !== application.aadhaar_reference_id) {
      await db.execute(
        `UPDATE ${APPLICATION_TABLE} SET aadhaar_reference_id = ? WHERE id = ?`,
        [transactionId, application.id]
      );
    }

    return isWebhook
      ? res.status(200).json({ success: true, status: "received", verificationStatus: "verified" })
      : res.redirect(`${getCallbackClientBaseUrl(req)}${getSuccessRedirectPath(req)}?aadhaar=verified`);
  } catch (error) {
    logger.error("Digitap Aadhaar callback error:", error);
    return isWebhook
      ? res.status(500).json({ success: false, message: "Unable to process Digitap callback" })
      : redirectAadhaarFailure(req, res, "callback_exception");
  }
};
export const completeReactAadhaarVerification = async (req, res, next) => {
  try {
    const applicationId = req.body.applicationId || req.body.id;
    if (!applicationId) throw badRequest("Application session not found. Please start again.");

    await ensureApplicationColumns();
    const lookup = buildApplicationLookup(applicationId);
    const [rows] = await db.execute(
      `SELECT id, aadhaar_masked, aadhaar_unique_id, aadhaar_reference_id, aadhaar_verified
       FROM ${APPLICATION_TABLE}
       WHERE ${lookup.clause}
       LIMIT 1`,
      lookup.values
    );
    const application = rows[0];
    if (!application?.aadhaar_reference_id) throw badRequest("Aadhaar verification session not found");

    let masked = application.aadhaar_masked || "";
    if (!Number(application.aadhaar_verified)) {
      const details = await fetchDigitapAadhaarData(application.aadhaar_reference_id);
      masked = await markAadhaarVerified(application, details);
    }

    return res.json({
      success: true,
      status: "success",
      message: "Aadhaar verification completed",
      data: { aadhaarMasked: masked, nextPath: getSuccessRedirectPath(req) },
    });
  } catch (error) {
    next(error);
  }
};
export const skipReactAadhaarVerification = async (req, res, next) => {
  try {
    const applicationId = req.body.applicationId || req.body.id;

    if (!applicationId) {
      throw badRequest("Application session not found. Please start again.");
    }

    await ensureApplicationColumns();

    const lookup = buildApplicationLookup(applicationId);
    const [result] = await db.execute(
      `UPDATE ${APPLICATION_TABLE}
       SET aadhaar_verified = 0,
           current_step = 'work_details',
           last_activity_at = NOW()
       WHERE ${lookup.clause}`,
      lookup.values
    );

    if (result.affectedRows === 0) {
      throw badRequest("Application not found");
    }
    return res.json({
      success: true,
      status: "success",
      message: "Aadhaar verification skipped temporarily",
      data: {
        nextPath: getSuccessRedirectPath(req),
      },
    });
  } catch (error) {
    next(error);
  }
};
