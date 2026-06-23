import logger from "../utils/logger.js";
import crypto from "crypto";
import db from "../configs/db.js";
import {
  CRM_ACTIVE_APPLICATION_API_URLS,
  CRM_CREATE_LEAD_API_URLS,
} from "../configs/integrations.js";

const firstPresent = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const asText = (...values) => String(firstPresent(...values) ?? "");
const asNumber = (...values) => Number(firstPresent(...values) ?? 0);
const phone10 = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
const pad2 = (value) => String(value).padStart(2, "0");
export const ACTIVE_APPLICATION_MESSAGE = "You have already applied for a loan.";

const isActiveApplicationMessage = (value) =>
  /already\s+(?:registered|appl(?:y|ied)|have|exist)|different\s+number|active\s+application/i.test(
    String(value || "")
  );

const decryptAadhaarNumber = (value) => {
  const encrypted = String(value || "").trim();
  if (!encrypted) return "";

  const plainDigits = onlyDigits(encrypted);
  if (/^[\d\s-]+$/.test(encrypted) && plainDigits.length === 12) return plainDigits;

  try {
    const secret = getAppSecret();
    const key = crypto.createHash("sha256").update(secret).digest();
    const iv = crypto.createHash("sha256").update(secret).digest("hex").slice(0, 16);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const decryptedDigits = onlyDigits(decrypted);

    return decryptedDigits.length === 12 ? decryptedDigits : "";
  } catch {
    return "";
  }
};

const normalizeVerificationStatus = (value) => {
  const raw = String(value ?? "").trim().toLowerCase();

  if (["1", "true", "yes", "verified", "success", "completed"].includes(raw)) return "verified";
  if (["0", "false", "no", "failed", "failure", "rejected"].includes(raw)) return "not_verified";
  return raw || "not_verified";
};

const buildCrmSourcePayload = (lead, aadhaarNumber, aadhaarVerified, aadhaarVerificationStatus) => {
  const sourcePayload =
    lead.sourcePayload && typeof lead.sourcePayload === "object"
      ? { ...lead.sourcePayload }
      : lead.source_payload && typeof lead.source_payload === "object"
        ? { ...lead.source_payload }
        : { ...lead };

  delete sourcePayload.aadhaarMasked;
  delete sourcePayload.aadhaar_masked;
  delete sourcePayload.aadharMasked;
  delete sourcePayload.aadhar_masked;

  return {
    ...sourcePayload,
    aadhaarNumber,
    aadhaar_number: aadhaarNumber,
    aadharNumber: aadhaarNumber,
    aadhar_number: aadhaarNumber,
    aadhaarVerified,
    aadhaar_verified: aadhaarVerified,
    aadharVerified: aadhaarVerified,
    aadhar_verified: aadhaarVerified,
    aadhaarVerificationStatus,
    aadhaar_verification_status: aadhaarVerificationStatus,
    aadharVerificationStatus: aadhaarVerificationStatus,
    aadhar_verification_status: aadhaarVerificationStatus,
  };
};

const asDateOnly = (...values) => {
  const value = firstPresent(...values);
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  }

  return raw.slice(0, 10);
};

const defaultConsents = {
  terms: {
    accepted: true,
    text: "Applicant accepted terms and conditions",
    version: "v1",
  },
  creditCheck: {
    accepted: true,
    text: "Applicant consented for credit bureau check",
    version: "v1",
  },
  dataSharing: {
    accepted: true,
    text: "Applicant consented for data sharing with lending partners",
    version: "v1",
  },
};

const buildTestingPayload = (lead) => {
  const applicationId = asText(lead.application_id, lead.applicationId, lead.id, Date.now());
  const recordId = asText(lead.id);
  const userId = asText(lead.user_id, lead.userId);
  const fullName = asText(lead.full_name, lead.fullName, lead.name, "Customer");
  const mobile = phone10(firstPresent(lead.mobile, lead.phone));
  const email = asText(lead.email, lead.office_email);
  const dob = asDateOnly(lead.dob);
  const panNumber = asText(lead.panNumber, lead.pan_number, lead.pan);
  const uanNumber = asText(lead.uanNumber, lead.uan_number);
  const aadhaarNumber = decryptAadhaarNumber(
    firstPresent(lead.aadhaarNumber, lead.aadhaar_number, lead.aadharNumber, lead.aadhar_number)
  );
  const aadhaarVerified = firstPresent(
    lead.aadhaarVerified,
    lead.aadhaar_verified,
    lead.aadharVerified,
    lead.aadhar_verified,
    0
  );
  const aadhaarVerificationStatus = normalizeVerificationStatus(aadhaarVerified);
  const sourcePayload = buildCrmSourcePayload(lead, aadhaarNumber, aadhaarVerified, aadhaarVerificationStatus);
  const aadhaarUniqueId = asText(lead.aadhaarUniqueId, lead.aadhaar_unique_id);
  const cibilReportUrl = asText(lead.cibilReportUrl, lead.cibil_report_url);
  const employmentStatus = asText(lead.employmentStatus, lead.employment_status, lead.employment, "salaried");
  const monthlyIncome = asNumber(lead.monthlyIncome, lead.monthly_income, lead.salary);
  const incomeReceivedIn = asText(lead.incomeReceivedIn, lead.income_received_in);
  const city = asText(lead.city);
  const pincode = asText(lead.pincode);
  const loanAmount = asNumber(lead.loanAmount, lead.loan_amount, lead.requestedLoanAmount);
  const loanPurpose = asText(lead.loanPurpose, lead.loan_purpose);
  const companyName = asText(lead.companyName, lead.company_name);
  const designation = asText(lead.designation);
  const officeEmail = asText(lead.officeEmail, lead.office_email);
  const salaryDay = asText(lead.salaryDay, lead.salary_day);
  const officeAddress = asText(lead.officeAddress, lead.office_address);
  const officePincode = asText(lead.officePincode, lead.office_pincode);
  const education = asText(lead.education);
  const experienceYears = asText(lead.experienceYears, lead.experience_years);
  const bankName = asText(lead.bankName, lead.bank_name);
  const branchName = asText(lead.branchName, lead.branch_name);
  const accountHolder = asText(lead.accountHolder, lead.account_holder);
  const accountNumber = asText(lead.accountNumber, lead.account_number);
  const ifscCode = asText(lead.ifscCode, lead.ifsc_code);
  const salarySlipCurrent = asText(lead.salarySlipCurrent, lead.salary_slip_current);
  const salarySlipPrevious = asText(lead.salarySlipPrevious, lead.salary_slip_previous);
  const salarySlipOld = asText(lead.salarySlipOld, lead.salary_slip_old);
  const companyIdCard = asText(lead.companyIdCard, lead.company_id_card);
  const selfieImage = asText(lead.selfieImage, lead.selfie_photo, lead.selfie_image);
  const videoKyc = asText(lead.videoKyc, lead.video_kyc);
  const currentStep = asText(lead.currentStep, lead.current_step);
  const submittedAt = asText(lead.submittedAt, lead.submitted_at, lead.submit_at);
  const submitAt = asText(lead.submitAt, lead.submit_at, lead.submitted_at);
  const lastActivityAt = asText(lead.lastActivityAt, lead.last_activity_at);
  const createdAt = asText(lead.createdAt, lead.created_at);
  const updatedAt = asText(lead.updatedAt, lead.updated_at);
  const priority = asText(lead.priority);
  const assignedTo = asText(lead.assignedTo, lead.assigned_to);
  const source = asText(lead.source, "waqtmoney");
  const externalApplicationId = asText(lead.externalApplicationId, lead.external_application_id);
  const syncStatus = asText(lead.syncStatus, lead.sync_status);
  const syncedAt = asText(lead.syncedAt, lead.synced_at);
  const ingestedAt = asText(lead.ingestedAt, lead.ingested_at);

  const reference1Name = asText(lead.reference1Name, lead.reference1_name);
  const reference1Mobile = phone10(firstPresent(lead.reference1Mobile, lead.reference1_mobile));
  const reference1Relation = asText(lead.reference1Relation, lead.reference1_relation);
  const reference2Name = asText(lead.reference2Name, lead.reference2_name);
  const reference2Mobile = phone10(firstPresent(lead.reference2Mobile, lead.reference2_mobile));
  const reference2Relation = asText(lead.reference2Relation, lead.reference2_relation);
  const references = [
    {
      fullName: reference1Name,
      mobile: reference1Mobile,
      relation: reference1Relation,
      referenceType: "primary",
    },
    {
      fullName: reference2Name,
      mobile: reference2Mobile,
      relation: reference2Relation,
      referenceType: "secondary",
    },
  ].filter((reference) => reference.fullName || reference.mobile || reference.relation);

  return {
    id: recordId,
    application_id: applicationId,
    user_id: userId,
    sourceSystem: "waqtmoney",
    sourceLeadId: applicationId,
    sourceApplicationId: asText(lead.sourceApplicationId, lead.source_application_id, applicationId),
    sourceStatus: asText(lead.sourceStatus, lead.source_status, lead.status, "submitted"),
    source_system: "waqtmoney",
    source_lead_id: applicationId,
    source_application_id: asText(lead.sourceApplicationId, lead.source_application_id, applicationId),
    source_status: asText(lead.sourceStatus, lead.source_status, lead.status, "submitted"),

    loanType: asText(lead.loanType, lead.loan_type, "payday"),
    loan_type: asText(lead.loanType, lead.loan_type, "payday"),
    name: fullName,
    fullName,
    full_name: fullName,
    phone: mobile,
    mobile,
    email,
    dob,

    panNumber,
    pan_number: panNumber,
    pan: panNumber,
    uanNumber,
    uan_number: uanNumber,
    aadhaarNumber,
    aadhaar_number: aadhaarNumber,
    aadhaar: aadhaarNumber || aadhaarUniqueId,
    aadharNumber: aadhaarNumber,
    aadhar_number: aadhaarNumber,
    aadhaarVerified,
    aadhaar_verified: aadhaarVerified,
    aadharVerified: aadhaarVerified,
    aadhar_verified: aadhaarVerified,
    aadhaarVerificationStatus,
    aadhaar_verification_status: aadhaarVerificationStatus,
    aadharVerificationStatus: aadhaarVerificationStatus,
    aadhar_verification_status: aadhaarVerificationStatus,
    aadhaarUniqueId,
    aadhaar_unique_id: aadhaarUniqueId,
    cibilReportUrl,
    cibil_report_url: cibilReportUrl,

    employmentStatus,
    employment_status: employmentStatus,
    monthlyIncome,
    monthly_income: monthlyIncome,
    incomeReceivedIn,
    income_received_in: incomeReceivedIn,
    city,
    pincode,

    loanAmount,
    loan_amount: loanAmount,
    loanPurpose,
    loan_purpose: loanPurpose,
    has_running_loan: firstPresent(lead.has_running_loan, lead.hasRunningLoan, 0),

    companyName,
    company_name: companyName,
    designation,
    officeEmail,
    office_email: officeEmail,
    salaryDay,
    salary_day: salaryDay,
    officeAddress,
    office_address: officeAddress,
    officePincode,
    office_pincode: officePincode,
    education,
    experienceYears,
    experience_years: experienceYears,

    reference1Name,
    reference1Mobile,
    reference1Relation,
    reference2Name,
    reference2Mobile,
    reference2Relation,
    reference1_name: reference1Name,
    reference1_mobile: reference1Mobile,
    reference1_relation: reference1Relation,
    reference2_name: reference2Name,
    reference2_mobile: reference2Mobile,
    reference2_relation: reference2Relation,
    references,

    bankName,
    bank_name: bankName,
    branchName,
    branch_name: branchName,
    accountHolder,
    account_holder: accountHolder,
    accountNumber,
    account_number: accountNumber,
    ifscCode,
    ifsc_code: ifscCode,

    salarySlipCurrent,
    salary_slip_current: salarySlipCurrent,
    salarySlipPrevious,
    salary_slip_previous: salarySlipPrevious,
    salarySlipOld,
    salary_slip_old: salarySlipOld,
    companyIdCard,
    company_id_card: companyIdCard,
    selfieImage,
    selfie_image: selfieImage,
    selfie_photo: selfieImage,
    videoKyc,
    video_kyc: videoKyc,
    status: asText(lead.status),
    currentStep,
    current_step: currentStep,
    submittedAt,
    submitted_at: submittedAt,
    submitAt,
    submit_at: submitAt,
    lastActivityAt,
    last_activity_at: lastActivityAt,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt,
    priority,
    assignedTo,
    assigned_to: assignedTo,
    source,
    externalApplicationId,
    external_application_id: externalApplicationId,
    syncStatus,
    sync_status: syncStatus,
    syncedAt,
    synced_at: syncedAt,
    ingestedAt,
    ingested_at: ingestedAt,
    sourcePayload,
    source_payload: sourcePayload,

    consentVersion: asText(lead.consentVersion, lead.consent_version, "v1"),
    consent_version: asText(lead.consentVersion, lead.consent_version, "v1"),
    consents: lead.consents || defaultConsents,
  };
};

const createActiveApplicationError = (details = {}) => {
  const error = new Error(ACTIVE_APPLICATION_MESSAGE);
  error.statusCode = 409;
  error.details = details;
  return error;
};

const isActiveApplicationResponse = (result = {}) =>
  result?.statusCode === 409 ||
  result?.status === 409 ||
  result?.blockedDuplicate === true ||
  result?.data?.exists === true ||
  result?.exists === true ||
  isActiveApplicationMessage(result?.data?.message) ||
  isActiveApplicationMessage(result?.message);

const buildActiveApplicationPayload = (lead) => {
  const payload = buildTestingPayload(lead);
  const aadhaar =
    payload.aadhaarNumber ||
    payload.aadhaar_number ||
    payload.aadharNumber ||
    payload.aadhar_number ||
    payload.aadhaarUniqueId ||
    payload.aadhaar_unique_id ||
    "";

  return {
    phone: payload.phone || payload.mobile || "",
    email: payload.email || "",
    pan: payload.panNumber || payload.pan_number || payload.pan || "",
    aadhaar,
  };
};

const CRM_ENDPOINTS = CRM_CREATE_LEAD_API_URLS.map((url, index) => ({
    name: index === 0 ? "waqtmoney-primary" : `waqtmoney-fallback-${index}`,
    url,
    keyEnvs: ["CRM_API_KEY", "CRM_INTEGRATION_API_KEY", "INTEGRATION_API_KEYS", "INTEGRATION_API_KEY"],
    keyHeader: "x-integration-api-key",
    payload: buildTestingPayload,
    primary: index === 0,
  }));

const CRM_ACTIVE_APPLICATION_ENDPOINTS = CRM_ACTIVE_APPLICATION_API_URLS.map((url, index) => ({
    name: index === 0 ? "waqtmoney-active-primary" : `waqtmoney-active-fallback-${index}`,
    url,
    keyEnvs: ["CRM_API_KEY", "CRM_INTEGRATION_API_KEY", "INTEGRATION_API_KEYS", "INTEGRATION_API_KEY"],
    keyHeader: "x-integration-api-key",
    payload: buildActiveApplicationPayload,
    primary: index === 0,
  }));

const getEnvKey = (endpoint) =>
  endpoint.keyEnvs.map((envName) => process.env[envName]?.trim()).find(Boolean);

const readJsonOrText = async (response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};
   
const syncEndpoint = async (endpoint, leadData) => {
  try {
    const apiKey = getEnvKey(endpoint);
    const payload = endpoint.payload ? endpoint.payload(leadData) : leadData;

    if (!apiKey && process.env.NODE_ENV === "production") {
      throw new Error(`${endpoint.keyEnvs.join(" or ")} is not configured`);
    }

    logger.info("CRM sync request:", {
      endpoint: endpoint.name,
      sourceApplicationId: payload.sourceApplicationId || payload.source_application_id,
      sourceLeadId: payload.sourceLeadId || payload.source_lead_id,
      populatedKeys: Object.entries(payload)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key]) => key),
    });

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { 
          [endpoint.keyHeader]: apiKey,
          "Authorization": `Bearer ${apiKey}`
        } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await readJsonOrText(response);

    logger.debug("CRM sync response:", {
      endpoint: endpoint.name,
      status: response.status,
      ok: response.ok,
      responseStatus: data?.status,
    });

    if (!response.ok) {
      logger.error("CRM sync failed response:", {
        endpoint: endpoint.name,
        status: response.status,
        data,
      });
    }

    return {
      endpoint: endpoint.name,
      ok: response.ok,
      statusCode: response.status,
      blockedDuplicate:
        response.status === 409 ||
        data?.exists === true ||
        isActiveApplicationMessage(data?.message),
      data,
    };
  } catch (error) {
    logger.error(`CRM sync error (${endpoint.name}):`, error.message);

    return {
      endpoint: endpoint.name,
      ok: false,
      status: "error",
      message: error.message,
    };
  }
};

const syncLeadToCRM = async (leadData) => {
  try {
    const results = [];

    for (const endpoint of CRM_ENDPOINTS) {
      const result = await syncEndpoint(endpoint, leadData);
      results.push(result);
      if (result.blockedDuplicate) break;
      if (result.ok) break;
    }

    const primary = results.find((result) => result.ok) || results[0];

    return {
      ...(primary?.data || {}),
      crmSyncResults: results,
    };
  } catch (error) {
    logger.error("CRM sync error:", error.message);

    return {
      status: "error",
      message: error.message,
    };
  }
};

export const checkActiveApplicationInCrmTables = async (leadData) => {
  const phone = String(leadData.phone || leadData.mobile || "").replace(/\D/g, "").slice(-10);
  const email = String(leadData.email || "").trim().toLowerCase();

  const INACTIVE_STATUSES = ["rejected", "closed", "cancelled", "deleted", "trash"];

  // 1. Check if CRM's loan_applications table exists in the database
  let crmTableExists = false;
  try {
    const [tables] = await db.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'loan_applications'`
    );

    if (tables && tables.length > 0) {
      crmTableExists = true;
    }
  } catch (err) {
    logger.error("Failed to query information_schema for CRM tables:", err.message);
  }

  if (crmTableExists) {
    // 2. Query the table for mobile number duplicate check (excluding inactive statuses)
    if (phone) {
      const [phoneRows] = await db.query(
        `SELECT status FROM \`loan_applications\` WHERE \`mobile\` LIKE ? LIMIT 1`,
        [`%${phone}%`]
      );

      if (phoneRows.length > 0) {
        const status = String(phoneRows[0].status || "").toLowerCase();
        if (!INACTIVE_STATUSES.includes(status)) {
          const error = new Error(`You have already applied for a loan with this number.`);
          error.statusCode = 409;
          throw error;
        }
      }
    }

    // 3. Query the table for email duplicate check (excluding inactive statuses)
    if (email) {
      const [emailRows] = await db.query(
        `SELECT status FROM \`loan_applications\` WHERE \`email\` = ? LIMIT 1`,
        [email]
      );

      if (emailRows.length > 0) {
        const status = String(emailRows[0].status || "").toLowerCase();
        if (!INACTIVE_STATUSES.includes(status)) {
          const error = new Error(`You have already applied with this email.`);
          error.statusCode = 409;
          throw error;
        }
      }
    }
    
    // If table existed and checked successfully but no active record was found, return success!
    return { exists: false };
  }

  // Fallback to API if table doesn't exist
  return null;
};

export const checkActiveApplicationInCRM = async (leadData) => {
  const duplicateCheckBypassEnabled =
    process.env.BYPASS_DUPLICATE_CHECK === "true" &&
    process.env.NODE_ENV !== "production" &&
    process.env.APP_ENV !== "production";

  if (duplicateCheckBypassEnabled) {
    logger.info("Bypassing active application check because BYPASS_DUPLICATE_CHECK is true");
    return { exists: false };
  }

  // 1. Perform local database check on CRM's loan_applications table if it exists
  await checkActiveApplicationInCrmTables(leadData).catch((err) => {
    if (err.statusCode === 409) throw err;
  });

  // 2. Perform local database check on our own client table (waqt_money_loan_applications)
  const phone = String(leadData.phone || leadData.mobile || "").replace(/\D/g, "").slice(-10);
  const email = String(leadData.email || "").trim().toLowerCase();

  let localTableExists = false;
  let hasStatus = false;
  let hasPhone = false;

  try {
    const [tables] = await db.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'waqt_money_loan_applications'`
    );
    if (tables && tables.length > 0) {
      localTableExists = true;

      const [columns] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'waqt_money_loan_applications'`
      );
      const colNames = new Set(columns.map((c) => String(c.COLUMN_NAME).toLowerCase()));
      hasStatus = colNames.has("status");
      hasPhone = colNames.has("phone");
    }
  } catch (err) {
    logger.error("Failed to query information_schema for local tables:", err.message);
  }

  if (localTableExists) {
    const INACTIVE_STATUSES = ["rejected", "closed", "cancelled", "deleted", "trash"];

    if (phone) {
      const phoneFilter = hasPhone ? "(mobile LIKE ? OR phone LIKE ?)" : "mobile LIKE ?";
      const statusFilter = hasStatus ? "AND status NOT IN (?)" : "";
      const query = `SELECT id FROM waqt_money_loan_applications WHERE ${phoneFilter} ${statusFilter} LIMIT 1`;

      const queryParams = hasPhone ? [`%${phone}%`, `%${phone}%`] : [`%${phone}%`];
      if (hasStatus) {
        queryParams.push(INACTIVE_STATUSES);
      }

      const [localRows] = await db.query(query, queryParams);
      if (localRows.length > 0) {
        const error = new Error(`You have already applied for a loan with this number.`);
        error.statusCode = 409;
        throw error;
      }
    }

    if (email) {
      const statusFilter = hasStatus ? "AND status NOT IN (?)" : "";
      const query = `SELECT id FROM waqt_money_loan_applications WHERE email = ? ${statusFilter} LIMIT 1`;

      const queryParams = [email];
      if (hasStatus) {
        queryParams.push(INACTIVE_STATUSES);
      }

      const [localEmailRows] = await db.query(query, queryParams);
      if (localEmailRows.length > 0) {
        const error = new Error(`You have already applied with this email.`);
        error.statusCode = 409;
        throw error;
      }
    }
  }

  // 3. Attempt to verify with the CRM API, but catch errors (like 401) gracefully.
  // We do not block the user if the CRM API is failing or misconfigured.
  try {
    const results = [];

    for (const endpoint of CRM_ACTIVE_APPLICATION_ENDPOINTS) {
      const result = await syncEndpoint(endpoint, leadData);
      results.push(result);

      if (isActiveApplicationResponse(result)) {
        throw createActiveApplicationError({ crmActiveApplicationResults: results });
      }

      if (result.ok && result.data?.exists === false) {
        return {
          ...(result.data || {}),
          crmActiveApplicationResults: results,
        };
      }
    }
  } catch (error) {
    if (error.statusCode === 409) {
      throw error; // Propagate duplicate application error (409)
    }
    logger.warn("CRM active application check failed, falling back to local validation:", error.message);
  }

  return { exists: false };
};

export const submitLeadToCRM = async (leadData) => {
  await checkActiveApplicationInCRM(leadData);

  const crmSync = await syncLeadToCRM(leadData);

  if (crmSync.crmSyncResults?.some(isActiveApplicationResponse) || isActiveApplicationResponse(crmSync)) {
    throw createActiveApplicationError({ crmSyncResults: crmSync.crmSyncResults || [] });
  }

  const successfulResult = crmSync.crmSyncResults?.find((result) => result.ok);

  if (!successfulResult) {
    const first = crmSync.crmSyncResults?.[0];
    const error = new Error(first?.data?.message || first?.message || crmSync.message || "Unable to create lead in CRM");
    error.statusCode = first?.statusCode || 502;
    error.details = { crmSyncResults: crmSync.crmSyncResults || [] };
    throw error;
  }

  return crmSync;
};

export default syncLeadToCRM;
