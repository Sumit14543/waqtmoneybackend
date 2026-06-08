import crypto from "crypto";
import db from "../configs/db.js";
import {
  BIFROST_BASE_URL,
  LOCAL_API_PUBLIC_BASE_URL,
  LOCAL_WEB_ORIGINS,
} from "../configs/integrations.js";
import logger from "../utils/logger.js";

const APPLICATION_TABLE = "waqt_money_loan_applications";
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || LOCAL_WEB_ORIGINS[0];
const API_PUBLIC_BASE_URL = process.env.API_PUBLIC_BASE_URL || LOCAL_API_PUBLIC_BASE_URL;
const SUCCESS_REDIRECT_PATH = "/user/work-details";
const BIFROST_AADHAAR_START_ENDPOINT =
  process.env.BIFROST_AADHAAR_START_ENDPOINT || "get-aadhaar-verification";
const BIFROST_AADHAAR_DATA_ENDPOINT =
  process.env.BIFROST_AADHAAR_DATA_ENDPOINT || "get-aadhaar-data";

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const conflict = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const RUNNING_LOAN_MESSAGE =
  "This Aadhaar number is already registered. Please use a different Aadhaar number.";
const FINAL_SUBMITTED_APPLICATION_CONDITION =
  "(lead_visible = 1 OR current_step = 'video_kyc_completed' OR completed_at IS NOT NULL)";

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

const getApiCallbackBaseUrl = () => {
  const baseUrl = API_PUBLIC_BASE_URL.replace(/\/$/, "");
  return baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;
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

const getBifrostBaseUrl = () => {
  const explicitBase = String(process.env.BIFROST_BASE_URL || "").trim();
  if (explicitBase) return explicitBase.replace(/\/$/, "");

  const apiUrl = String(process.env.BIFROST_API_URL || "").trim();
  if (apiUrl) return apiUrl.replace(/\/[^/]*$/, "").replace(/\/$/, "");

  return BIFROST_BASE_URL;
};

const getBifrostEndpointUrl = (endpoint, explicitUrl) => {
  const configuredUrl = String(explicitUrl || "").trim();
  if (configuredUrl) return configuredUrl;
  return `${getBifrostBaseUrl()}/${endpoint}`;
};

const getBifrostToken = () =>
  (
    process.env.BIFROST_AADHAAR_API_TOKEN ||
    process.env.BIFROST_REACT_API_TOKEN ||
    process.env.BIFROST_API_TOKEN ||
    process.env.PAN_API_KEY ||
    ""
  ).trim();

const sanitizeRedirectPath = (value, fallback = SUCCESS_REDIRECT_PATH) => {
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
};

const getSuccessRedirectPath = (req) =>
  sanitizeRedirectPath(req.aadhaarSuccessRedirectPath || process.env.REACT_AADHAAR_SUCCESS_REDIRECT_PATH);

const getFailureRedirectPath = (req) =>
  sanitizeRedirectPath(req.aadhaarFailureRedirectPath || process.env.REACT_AADHAAR_FAILURE_REDIRECT_PATH, "/user/kyc-aadhaar");

const getBifrostCallbackUrl = (req) => {
  const configuredUrl = String(
    req?.aadhaarCallbackUrl ||
      process.env.BIFROST_AADHAAR_CALLBACK_URL ||
      process.env.BIFROST_CALLBACK_URL ||
      ""
  ).trim();

  if (configuredUrl) return configuredUrl;
  const callbackPath = sanitizeRedirectPath(req?.aadhaarCallbackPath || "/react-aadhaar/callback", "/react-aadhaar/callback");
  return `${getApiCallbackBaseUrl()}${callbackPath}`;
};

const buildBifrostHeaders = () => {
  const token = getBifrostToken();

  if (!token) {
    const error = new Error("BIFROST_API_TOKEN is not configured");
    error.statusCode = 500;
    throw error;
  }

  return {
    "Content-Type": "application/json",
    Authorization: `${process.env.BIFROST_AUTH_PREFIX ?? ""}${token}`,
  };
};

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

const throwBifrostError = (data, fallbackMessage, statusCode = 502) => {
  const message = data?.msg || data?.message || data?.errorMessage || data?.error;
  const error = new Error(message || fallbackMessage);
  error.statusCode = statusCode;
  error.details = data;
  throw error;
};

const callBifrostUrl = async (url, payload, serviceName) => {
  const response = await fetch(url, {
    method: "POST",
    headers: buildBifrostHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await readJsonResponse(response, serviceName);

  if (!response.ok || data?.error === true || String(data?.status || "").toLowerCase() === "failed") {
    throwBifrostError(data, `${serviceName} rejected the request`, response.status);
  }

  return data;
};

const getNested = (value, keys) => {
  for (const key of keys) {
    const result = key.split(".").reduce((current, part) => current?.[part], value);
    if (result) return result;
  }
  return "";
};

const parseBifrostStartResponse = (response) => {
  const uniqueId = getNested(response, [
    "data.uniqueId",
    "data.unique_id",
    "data.transactionId",
    "data.transaction_id",
    "data.requestId",
    "data.request_id",
    "uniqueId",
    "unique_id",
    "transactionId",
    "transaction_id",
    "requestId",
    "request_id",
  ]);
  const authorizationUrl = getNested(response, [
    "data.authorizationUrl",
    "data.authorization_url",
    "data.url",
    "data.kycUrl",
    "data.redirectUrl",
    "authorizationUrl",
    "authorization_url",
    "url",
    "kycUrl",
    "redirectUrl",
  ]);

  return { uniqueId: String(uniqueId || ""), authorizationUrl: String(authorizationUrl || "") };
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

const compactCallbackQuery = (query) =>
  Object.fromEntries(
    Object.entries(query || {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(String).join(",") : String(value ?? ""),
    ])
  );

const redirectAadhaarFailure = (req, res, reason) =>
  res.redirect(
    `${CLIENT_BASE_URL}${getFailureRedirectPath(req)}?aadhaar=failed&reason=${encodeURIComponent(reason)}`
  );

const getCallbackPayload = (req) => ({
  ...(req.query || {}),
  ...(req.body && typeof req.body === "object" ? req.body : {}),
});

const fetchBifrostAadhaarData = async (ids) => {
  const dataUrl = getBifrostEndpointUrl(
    BIFROST_AADHAAR_DATA_ENDPOINT,
    process.env.BIFROST_AADHAAR_DATA_URL
  );
  const candidates = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
  const payloadKeys = ["uniqueId", "unique_id", "transactionId", "transaction_id", "requestId", "request_id"];
  let lastError;

  for (const id of candidates) {
    for (const key of payloadKeys) {
      try {
        return await callBifrostUrl(dataUrl, { [key]: id }, "Bifrost Aadhaar data");
      } catch (error) {
        lastError = error;
        logger.warn(`Bifrost Aadhaar data failed with ${key}:`, { id, error: error.message });
      }
    }
  }

  throw lastError || new Error("Bifrost Aadhaar data id not found");
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

    if (!applicationId) {
      throw badRequest("Application session not found. Please start again.");
    }

    if (!/^\d{12}$/.test(aadhaar)) {
      throw badRequest("Invalid Aadhaar number");
    }

    await ensureApplicationColumns();

    const masked = `XXXXXXXX${aadhaar.slice(-4)}`;
    const encryptedAadhaar = encryptData(aadhaar);
    const lookup = buildApplicationLookup(applicationId);
    const [duplicateRows] = await db.execute(
      `SELECT id, application_id
       FROM ${APPLICATION_TABLE}
       WHERE aadhaar_number = ?
         AND aadhaar_number IS NOT NULL
         AND aadhaar_number <> ''
         AND ${FINAL_SUBMITTED_APPLICATION_CONDITION}
         AND COALESCE(current_step, '') NOT IN ('loan_closed', 'rejected', 'cancelled')
         AND NOT (${lookup.clause})
       ORDER BY last_activity_at DESC, id DESC
       LIMIT 1`,
      [encryptedAadhaar, ...lookup.values]
    );

    if (duplicateRows.length > 0) {
      throw conflict(RUNNING_LOAN_MESSAGE);
    }

    const [updateResult] = await db.execute(
      `UPDATE ${APPLICATION_TABLE}
       SET aadhaar_number = ?,
           aadhaar_masked = ?,
           aadhaar_verified = 0,
           current_step = 'react_aadhaar_verify',
           last_activity_at = NOW()
       WHERE ${lookup.clause}`,
      [encryptedAadhaar, masked, ...lookup.values]
    );

    if (updateResult.affectedRows === 0) {
      throw badRequest("Application not found");
    }

    const [rows] = await db.execute(
      `SELECT id, application_id
       FROM ${APPLICATION_TABLE}
       WHERE ${lookup.clause}
       LIMIT 1`,
      lookup.values
    );
    const application = rows[0] || {};
    const referenceId = `${application.application_id || applicationId}-${Date.now()}`
      .replace(/[^\w.@-]/g, "")
      .slice(0, 120);
    const startUrl = getBifrostEndpointUrl(
      BIFROST_AADHAAR_START_ENDPOINT,
      process.env.BIFROST_AADHAAR_START_URL
    );
    const verification = await callBifrostUrl(
      startUrl,
      {
        referenceId,
      },
      "Bifrost Aadhaar verification"
    );
    const { uniqueId, authorizationUrl } = parseBifrostStartResponse(verification);

    if (!uniqueId || !authorizationUrl) {
      throwBifrostError(verification, "Bifrost did not return an Aadhaar verification URL");
    }

    await db.execute(
      `UPDATE ${APPLICATION_TABLE}
       SET aadhaar_unique_id = ?,
           aadhaar_reference_id = ?,
           current_step = 'react_aadhaar_callback',
           last_activity_at = NOW()
       WHERE ${lookup.clause}`,
      [uniqueId, referenceId, ...lookup.values]
    );
    return res.json({
      success: true,
      status: "pending",
      message: "Aadhaar DigiLocker verification started",
      data: {
        aadhaarMasked: masked,
        uniqueId,
        referenceId,
        callbackUrl: getBifrostCallbackUrl(req),
        authorizationUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleReactAadhaarCallback = async (req, res) => {
  try {
    const callbackPayload = getCallbackPayload(req);
    logger.info("React Aadhaar callback payload:", compactCallbackQuery(callbackPayload));

    const uniqueId = getCallbackIdentifier(callbackPayload, [
      "uniqueId",
      "unique_id",
      "uid",
      "transactionId",
      "transaction_id",
      "txnId",
      "txn_id",
      "requestId",
      "request_id",
      "sessionId",
      "session_id",
      "uuid",
      "aadhaarUniqueId",
      "aadhaar_unique_id",
      "id",
    ]);
    const referenceId = getCallbackIdentifier(callbackPayload, [
      "referenceId",
      "reference_id",
      "reference",
      "refId",
      "ref_id",
      "refNo",
      "ref_no",
      "clientReferenceId",
      "client_reference_id",
      "clientRefId",
      "client_ref_id",
      "applicationId",
      "application_id",
    ]);
    const successValue = String(callbackPayload.success ?? callbackPayload.status ?? "").toLowerCase();
    const isExplicitFailure = ["false", "failed", "failure", "error", "cancelled", "canceled"].includes(successValue);

    if (isExplicitFailure) {
      return redirectAadhaarFailure(req, res, "provider_failed");
    }

    await ensureApplicationColumns();

    let rows = [];

    if (uniqueId || referenceId) {
      [rows] = await db.execute(
        `SELECT id, aadhaar_masked, aadhaar_unique_id, aadhaar_reference_id
         FROM ${APPLICATION_TABLE}
         WHERE aadhaar_unique_id IN (?, ?)
            OR aadhaar_reference_id IN (?, ?)
         LIMIT 1`,
        [
          String(uniqueId || ""),
          String(referenceId || ""),
          String(uniqueId || ""),
          String(referenceId || ""),
        ]
      );
    }

    if (rows.length === 0) {
      [rows] = await db.execute(
        `SELECT id, aadhaar_masked, aadhaar_unique_id, aadhaar_reference_id
         FROM ${APPLICATION_TABLE}
         WHERE current_step = 'react_aadhaar_callback'
           AND aadhaar_verified = 0
         ORDER BY last_activity_at DESC, id DESC
         LIMIT 1`
      );
    }

    const application = rows[0];

    if (!application) {
      return res.redirect(`${CLIENT_BASE_URL}${getFailureRedirectPath(req)}?aadhaar=expired`);
    }

    let details = {};
    try {
      const detailsResponse = await fetchBifrostAadhaarData([
        application.aadhaar_unique_id,
        uniqueId,
        referenceId,
        application.aadhaar_reference_id,
      ]);
      details = detailsResponse?.data || detailsResponse;
    } catch (error) {
      logger.warn("Bifrost Aadhaar data fetch failed after callback; marking verified from callback:", error.message);
    }

    await markAadhaarVerified(application, details);
    return res.redirect(`${CLIENT_BASE_URL}${getSuccessRedirectPath(req)}?aadhaar=verified`);
  } catch (error) {
    logger.error("React Aadhaar callback error:", error);
    return redirectAadhaarFailure(req, res, error.message || "callback_exception");
  }
};

export const completeReactAadhaarVerification = async (req, res, next) => {
  try {
    const applicationId = req.body.applicationId || req.body.id;

    await ensureApplicationColumns();

    let rows = [];

    if (applicationId) {
      const lookup = buildApplicationLookup(applicationId);
      [rows] = await db.execute(
        `SELECT id, aadhaar_masked, aadhaar_unique_id, aadhaar_reference_id
         FROM ${APPLICATION_TABLE}
         WHERE ${lookup.clause}
         LIMIT 1`,
        lookup.values
      );
    }

    if (rows.length === 0) {
      [rows] = await db.execute(
        `SELECT id, aadhaar_masked, aadhaar_unique_id, aadhaar_reference_id
         FROM ${APPLICATION_TABLE}
         WHERE current_step = 'react_aadhaar_callback'
           AND aadhaar_verified = 0
           AND (aadhaar_unique_id IS NOT NULL OR aadhaar_reference_id IS NOT NULL)
         ORDER BY last_activity_at DESC, id DESC
         LIMIT 1`
      );
    }

    const application = rows[0];

    if (!application) {
      throw badRequest("Aadhaar verification session not found");
    }

    let details = {};
    if (application.aadhaar_unique_id || application.aadhaar_reference_id) {
      try {
        const detailsResponse = await fetchBifrostAadhaarData([
          application.aadhaar_unique_id,
          application.aadhaar_reference_id,
        ]);
        details = detailsResponse?.data || detailsResponse;
      } catch (error) {
        logger.warn("Bifrost Aadhaar completion data fetch failed; completing from saved session:", error.message);
      }
    }

    const masked = await markAadhaarVerified(application, details);
    return res.json({
      success: true,
      status: "success",
      message: "Aadhaar verification completed",
      data: {
        aadhaarMasked: masked,
        nextPath: getSuccessRedirectPath(req),
      },
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
