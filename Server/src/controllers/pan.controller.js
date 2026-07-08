import db from "../configs/db.js";
import {
  INDIA_POST_PINCODE_API_URL,
  PAN_DETAILS_API_URL,
  PINCODES_INFO_API_URL,
} from "../configs/integrations.js";
import { getApplicationUanById, saveApplicationUanById } from "../services/application.service.js";
import { checkActiveApplicationInCRM } from "../services/crm.service.js";
import { extractUanNumber, fetchUanByMobile } from "../services/uan.service.js";
import logger from "../utils/logger.js";

const APPLICATION_TABLE = "waqt_money_loan_applications";
const LEGACY_APPLICATION_TABLE = "loan_applications";

const isProduction = () => process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

const isLocalPanMockEnabled = () =>
  process.env.PAN_MOCK_IN_LOCAL === "true" ||
  (!isProduction() && process.env.PAN_MOCK_IN_LOCAL !== "false");

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

const createLocalPanDetails = (pan) => ({
  result: {},
  fullName: "WAQT MONEY TEST USER",
  dob: "1990-01-01",
  fatherName: "TEST FATHER",
  gender: "Male",
  aadhaarMasked: "XXXXXXXX1234",
  uanNumber: "",
});

const ensureApplicationColumns = async (columns) => {
  const [existingColumns] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [APPLICATION_TABLE]
  );

  const existingNames = new Set(existingColumns.map((column) => column.COLUMN_NAME));

  for (const [name, definition] of columns) {
    if (!existingNames.has(name)) {
      await db.execute(`ALTER TABLE ${APPLICATION_TABLE} ADD COLUMN ${name} ${definition}`);
    }
  }
};

const tableExists = async (tableName) => {
  const [rows] = await db.execute(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  );

  return rows.length > 0;
};

const getLegacyUanByApplicationId = async (applicationId) => {
  if (!applicationId || !(await tableExists(LEGACY_APPLICATION_TABLE))) return "";

  const [rows] = await db.execute(
    `SELECT uan_number
     FROM ${LEGACY_APPLICATION_TABLE}
     WHERE application_id = ?
     LIMIT 1`,
    [applicationId]
  );

  return rows[0]?.uan_number || "";
};

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const findValueByKeys = (source, keys) => {
  if (!source || typeof source !== "object") return "";

  const normalizeKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedKeys = keys.map(normalizeKey);

  for (const key of keys) {
    if (source[key]) return source[key];
  }

  for (const [key, value] of Object.entries(source)) {
    if (normalizedKeys.includes(normalizeKey(key)) && value) return value;
  }

  for (const value of Object.values(source)) {
    const nestedValue = findValueByKeys(value, keys);
    if (nestedValue) return nestedValue;
  }

  return "";
};

const formatDate = (date) => {
  if (!date) return "";

  const rawDate = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) return rawDate.slice(0, 10);

  return parsedDate.toISOString().split("T")[0];
};

const maskAadhaar = (value) => {
  const compact = String(value || "").replace(/\s/g, "");
  const digits = compact.replace(/\D/g, "");

  if (/^\d{12}$/.test(digits)) return `XXXXXXXX${digits.slice(-4)}`;
  if (/^X{8,}\d{4}$/i.test(compact)) return `XXXXXXXX${compact.slice(-4)}`;
  if (/^\d{2}X{8}\d{2}$/i.test(compact)) return `${compact.slice(0, 2)}XXXXXXXX${compact.slice(-2)}`;
  if (/^\d+X+\d{1,3}$/i.test(compact)) {
    const lastDigits = compact.match(/\d{1,3}$/)?.[0] || "";
    return compact.length >= 4 && lastDigits.length === 2
      ? `${compact.slice(0, 2)}XXXXXXXX${lastDigits}`
      : "";
  }

  const trailingDigits = compact.match(/\d{4}$/);
  if (trailingDigits) return `XXXXXXXX${trailingDigits[0]}`;

  return "";
};

const parsePanApiResponse = (data) => {
  const result = data?.data?.result || {};
  const nameParts = result.name || {};

  const fullName = normalizeText(
    result.full_name ||
      result.fullName ||
      [nameParts.first_name, nameParts.middle_name, nameParts.last_name].filter(Boolean).join(" ")
  );

  const dob = formatDate(result.dob || result.date_of_birth || result.dateOfBirth);

  const fatherName = normalizeText(
    result.father_name ||
      result.fatherName ||
      findValueByKeys(result, [
        "fathers_name",
        "fathersName",
        "father_full_name",
        "fatherFullName",
        "father",
        "fatherNameOnPan",
        "father_name_on_pan",
        "father_or_spouse_name",
        "fatherOrSpouseName",
        "parent_name",
        "parentName",
        "guardian_name",
        "guardianName",
      ]) ||
      findValueByKeys(data, [
        "father_name",
        "fatherName",
        "fathers_name",
        "fathersName",
        "father_full_name",
        "fatherFullName",
        "father",
        "fatherNameOnPan",
        "father_name_on_pan",
        "father_or_spouse_name",
        "fatherOrSpouseName",
        "parent_name",
        "parentName",
        "guardian_name",
        "guardianName",
      ])
  );

  const gender = normalizeText(
    result.gender ||
      findValueByKeys(result, ["gender_name", "genderName", "sex"]) ||
      findValueByKeys(data, ["gender", "gender_name", "genderName", "sex"])
  );

  const aadhaarMasked = maskAadhaar(
    result.masked_aadhaar ||
      result.maskedAadhaar ||
      result.masked_aadhar ||
      result.maskedAadhar ||
      findValueByKeys(result, [
        "aadhaar",
        "aadhar",
        "aadhaar_number",
        "aadhar_number",
        "aadhaarNumber",
        "aadharNumber",
        "aadhaar_masked",
        "aadhar_masked",
        "uid",
        "uidai",
      ]) ||
      findValueByKeys(data, [
        "masked_aadhaar",
        "masked_aadhar",
        "maskedAadhaar",
        "maskedAadhar",
        "aadhaar",
        "aadhar",
        "aadhaar_number",
        "aadhar_number",
        "aadhaarNumber",
        "aadharNumber",
        "aadhaar_masked",
        "aadhar_masked",
        "uid",
        "uidai",
      ])
  );

  return {
    result,
    fullName,
    dob,
    fatherName,
    gender,
    aadhaarMasked,
  };
};

const savePanVerification = async ({ applicationId, pan, fullName, dob, uanNumber, aadhaarMasked }) => {
  if (!applicationId) {
    const error = new Error("Application session not found. Please start application again.");
    error.statusCode = 400;
    throw error;
  }

  await ensureApplicationColumns([
    ["uan_number", "varchar(20) NULL"],
    ["pan_aadhaar_masked", "varchar(20) NULL"],
  ]);

  const lookup = buildApplicationLookup(applicationId);
  const [result] = await db.execute(
    `UPDATE ${APPLICATION_TABLE}
     SET pan_number = ?,
         full_name = ?,
         dob = ?,
         uan_number = COALESCE(?, uan_number),
         pan_aadhaar_masked = ?,
         current_step = 'pan_verify',
         last_activity_at = NOW()
     WHERE ${lookup.clause}`,
    [pan, fullName, dob, uanNumber || null, aadhaarMasked || null, ...lookup.values]
  );

  if (result.affectedRows === 0) {
    const error = new Error("Application not found in local database. Please start a fresh application.");
    error.statusCode = 400;
    throw error;
  }
};

const sendPanVerificationResponse = (res, {
  pan,
  fullName,
  dob,
  fatherName = "",
  gender = "",
  uanNumber = "",
  aadhaarMasked = "",
  localMock = false,
}) => res.json({
  success: true,
  status: "success",
  pan,
  name: fullName,
  full_name: fullName,
  dob,
  father_name: fatherName,
  fatherName,
  gender,
  uan_number: uanNumber,
  uanNumber,
  aadhaarMasked,
  aadhaar_masked: aadhaarMasked,
  localMock,
});

export const verifyPan = async (req, res) => {
  const PAN_Number = String(req.body.PAN_Number || req.body.pan || "").trim().toUpperCase();
  const applicationId = req.body.applicationId || req.body.id || null;
  logger.debug("PAN verification requested:", { hasPan: Boolean(PAN_Number), hasApplicationId: Boolean(applicationId) });

  if (!PAN_Number) {
    return res.status(400).json({ message: "PAN is required" });
  }

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(PAN_Number)) {
    return res.status(400).json({ message: "Invalid PAN format" });
  }

  try {
    await checkActiveApplicationInCRM({
      pan: PAN_Number,
      sourceSystem: "waqtmoney",
      source: "waqtmoney",
      loanType: "payday",
      loan_type: "payday",
    });

    const panApiToken = process.env.BIFROST_API_TOKEN || process.env.PAN_API_KEY || "";

    if (!panApiToken && isLocalPanMockEnabled()) {
      const mockDetails = createLocalPanDetails(PAN_Number);

      await savePanVerification({
        applicationId,
        pan: PAN_Number,
        fullName: mockDetails.fullName,
        dob: mockDetails.dob,
        uanNumber: mockDetails.uanNumber,
        aadhaarMasked: mockDetails.aadhaarMasked,
      });

      logger.warn("PAN API token missing. Using local mock PAN verification.", {
        pan: PAN_Number,
        applicationId,
      });

      return sendPanVerificationResponse(res, {
        pan: PAN_Number,
        ...mockDetails,
        localMock: true,
      });
    }

    if (!panApiToken) {
      return res.status(503).json({
        message: "PAN verification token is not configured on server",
      });
    }

    const apiRes = await fetch(PAN_DETAILS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: panApiToken,
      },
      body: JSON.stringify({
        PAN_Number,
        Concent_Text:
          "We confirm and undertake that valid end-user consent has been obtained for fetching PAN DETAILS using PAN NUMBER, and that such consent remains active and unrevoked at the time of this request.",
        Concent: "Y",
      }),
    });

    const text = await apiRes.text();
    logger.debug("PAN API response received:", {
      status: apiRes.status,
      contentLength: text.length,
    });

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ message: "Invalid JSON from PAN API" });
    }

    if (!apiRes.ok || data?.error === true) {
      if (isLocalPanMockEnabled() && /token not provided|unauthorized|invalid token/i.test(String(data?.message || ""))) {
        const mockDetails = createLocalPanDetails(PAN_Number);

        await savePanVerification({
          applicationId,
          pan: PAN_Number,
          fullName: mockDetails.fullName,
          dob: mockDetails.dob,
          uanNumber: mockDetails.uanNumber,
          aadhaarMasked: mockDetails.aadhaarMasked,
        });

        logger.warn("PAN API auth failed. Using local mock PAN verification.", {
          status: apiRes.status,
          message: data?.message,
          pan: PAN_Number,
          applicationId,
        });

        return sendPanVerificationResponse(res, {
          pan: PAN_Number,
          ...mockDetails,
          localMock: true,
        });
      }

      return res.status(apiRes.ok ? 502 : apiRes.status).json({
        message: "PAN verification could not be completed. Please check the PAN and try again.",
      });
    }

    const { result, fullName, dob, fatherName, gender, aadhaarMasked } = parsePanApiResponse(data);
    let uanNumber = extractUanNumber(data);

    if (applicationId) {
      await ensureApplicationColumns([["uan_number", "varchar(20) NULL"]]);

      const lookup = buildApplicationLookup(applicationId);
      const [applicationRows] = await db.execute(
        `SELECT mobile, uan_number
         FROM ${APPLICATION_TABLE}
         WHERE ${lookup.clause}
         LIMIT 1`,
        lookup.values
      );

      const application = applicationRows[0];
      uanNumber = application?.uan_number || "";

      if (!uanNumber && process.env.UAN_LOOKUP_SYNC_ON_PAN === "true") {
        uanNumber = await getApplicationUanById(applicationId).catch((error) => {
          logger.error("Application UAN sync error:", error.message);
          return "";
        });
      } else if (!uanNumber && process.env.UAN_LOOKUP_BACKGROUND_ON_PAN === "true") {
        setTimeout(() => getApplicationUanById(applicationId).catch((error) => {
          logger.error("Background PAN UAN sync error:", error.message);
        }), 0);
      } else if (!uanNumber && application?.mobile && process.env.UAN_LOOKUP_DIRECT_ON_PAN === "true") {
        uanNumber = await fetchUanByMobile(application.mobile).catch((error) => {
          logger.error("UAN lookup error:", error.message);
          return "";
        });

        if (uanNumber) {
          await saveApplicationUanById(applicationId, uanNumber).catch((error) => {
            logger.error("UAN save error:", error.message);
          });
        }
      }
    }

    logger.debug("PAN extracted fields:", {
      resultKeys: Object.keys(result),
      hasFatherName: Boolean(fatherName),
      hasGender: Boolean(gender),
      hasAadhaarMasked: Boolean(aadhaarMasked),
      hasUanNumber: Boolean(uanNumber),
      gender: gender || null,
    });

    if (!fullName || !dob) {
      return res.status(502).json({ message: "PAN details not found" });
    }

    if (applicationId) {
      await savePanVerification({
        applicationId,
        pan: PAN_Number,
        fullName,
        dob,
        uanNumber,
        aadhaarMasked,
      });
    }

    return sendPanVerificationResponse(res, {
      pan: PAN_Number,
      fullName,
      dob,
      fatherName,
      gender,
      uanNumber,
      aadhaarMasked,
    });
  } catch (error) {
    logger.error("PAN API Error:", error.message);
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "PAN verification failed" });
  }
};

export const skipPanVerification = async (req, res) => {
  const applicationId = req.body.applicationId || req.body.id || null;

  if (!applicationId) {
    return res.status(400).json({
      success: false,
      message: "Application session not found. Please start application again.",
    });
  }

  try {
    const lookup = buildApplicationLookup(applicationId);
    const [result] = await db.execute(
      `UPDATE ${APPLICATION_TABLE}
       SET current_step = 'pan_verify',
           last_activity_at = NOW()
       WHERE ${lookup.clause}`,
      lookup.values
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Application not found in local database. Please start a fresh application.",
      });
    }

    return res.json({
      success: true,
      status: "success",
      message: "PAN verification skipped temporarily",
      data: {
        nextPath: "/user/kyc-aadhaar",
      },
    });
  } catch (error) {
    logger.error("PAN skip error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Failed to skip PAN verification",
    });
  }
};

export const getCityByPincode = async (req, res) => {
  const pincode = String(req.body.pincode || "").replace(/\D/g, "").slice(0, 6);
  if (!pincode) {
    return res.status(400).json({ message: "Pincode is required" });
  }

  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({ message: "Invalid pincode" });
  }

  const titleCase = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

  const fetchIndiaPostPincode = async () => {
    const response = await fetch(`${INDIA_POST_PINCODE_API_URL}/${pincode}`);
    const data = await response.json();

    if (data?.[0]?.Status === "Success" && data[0].PostOffice?.length) {
      const postOffice = data[0].PostOffice[0];

      return {
        city: postOffice.District || postOffice.Block || postOffice.Region || "",
        state: postOffice.State || "",
      };
    }

    return null;
  };

  const fetchPincodesInfo = async () => {
    const response = await fetch(`${PINCODES_INFO_API_URL}/${pincode}`);
    const data = await response.json();
    const result = data?.results?.[0];

    if (data?.success && result) {
      return {
        city: titleCase(result.district || result.taluk || result.office_name),
        state: titleCase(result.state),
      };
    }

    return null;
  };

  try {
    let location = null;

    try {
      location = await fetchIndiaPostPincode();
    } catch (error) {
      logger.warn("India Post pincode API failed:", error.message);
    }

    if (!location) {
      location = await fetchPincodesInfo();
    }

    if (!location?.city) {
      return res.status(404).json({ message: "Invalid pincode" });
    }

    return res.json({
      success: true,
      city: location.city,
      state: location.state,
    });
  } catch (error) {
    logger.error("Pincode API Error:", error.message);
    return res.status(500).json({ message: "Failed to fetch city details" });
  }
};
