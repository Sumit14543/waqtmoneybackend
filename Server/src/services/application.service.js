import db from "../configs/db.js";
import mysql from "mysql2/promise";
import { fetchUanByMobile } from "./uan.service.js";

const APPLICATION_TABLE = "waqt_money_loan_applications";
const LEGACY_APPLICATION_TABLE = "loan_applications";
const HERO_LEADS_TABLE = "waqt_money_hero_leads";
const CONTACT_QUERIES_TABLE = "waqt_money_contact_queries";
let legacyDbPool;
let applicationTableReady = false;

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const ensureApplicationTable = async () => {
  if (applicationTableReady) return;

  if (await tableExists(APPLICATION_TABLE)) {
    applicationTableReady = true;
    return;
  }

  await db.execute(
    `CREATE TABLE ${APPLICATION_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id VARCHAR(64) NOT NULL UNIQUE,
      loan_type VARCHAR(50) NULL,
      mobile VARCHAR(20) NULL,
      email VARCHAR(255) NULL,
      pan_number VARCHAR(20) NULL,
      uan_number VARCHAR(20) NULL,
      employment_status VARCHAR(100) NULL,
      monthly_income DECIMAL(12,2) NULL,
      loan_amount DECIMAL(12,2) NULL,
      loan_purpose VARCHAR(255) NULL,
      has_running_loan TINYINT(1) DEFAULT 0,
      full_name VARCHAR(255) NULL,
      dob DATE NULL,
      pincode VARCHAR(10) NULL,
      city VARCHAR(100) NULL,
      company_name VARCHAR(255) NULL,
      designation VARCHAR(255) NULL,
      office_email VARCHAR(255) NULL,
      salary_day INT NULL,
      office_address TEXT NULL,
      office_pincode VARCHAR(10) NULL,
      education VARCHAR(100) NULL,
      experience_years INT NULL,
      bank_name VARCHAR(255) NULL,
      branch_name VARCHAR(255) NULL,
      account_holder VARCHAR(255) NULL,
      account_number VARCHAR(32) NULL,
      ifsc_code VARCHAR(20) NULL,
      reference1_name VARCHAR(255) NULL,
      reference1_mobile VARCHAR(15) NULL,
      reference1_relation VARCHAR(100) NULL,
      reference2_name VARCHAR(255) NULL,
      reference2_mobile VARCHAR(15) NULL,
      reference2_relation VARCHAR(100) NULL,
      selfie_photo VARCHAR(255) NULL,
      salary_slip_current VARCHAR(255) NULL,
      video_kyc VARCHAR(255) NULL,
      current_step VARCHAR(100) NULL,
      submit_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME NULL,
      INDEX idx_application_mobile (mobile),
      INDEX idx_application_pan (pan_number),
      INDEX idx_application_activity (last_activity_at)
    )`
  );

  applicationTableReady = true;
};

const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);

const normalizeUanNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^\d{12}$/.test(digits) ? digits : "";
};

const ensureColumns = async (columns) => {
  await ensureApplicationTable();

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
  if (!applicationId) return "";

  const currentDbUan = await getLegacyUanFromConnection(db, applicationId).catch(() => "");
  if (currentDbUan) return currentDbUan;

  const legacyDb = getLegacyDbPool();
  if (!legacyDb) return "";

  return getLegacyUanFromConnection(legacyDb, applicationId).catch((error) => {
    console.error("External legacy UAN lookup error:", error.message);
    return "";
  });
};

const getLegacyDbPool = () => {
  const host = process.env.LEGACY_DB_HOST;
  const user = process.env.LEGACY_DB_USER;
  const database = process.env.LEGACY_DB_NAME;

  if (!host || !user || !database) return null;

  if (!legacyDbPool) {
    const rawPassword = process.env.LEGACY_DB_PASS ?? "";
    const poolConfig = {
      host,
      user,
      database,
      port: Number.parseInt(process.env.LEGACY_DB_PORT || "3306", 10),
      waitForConnections: true,
      connectionLimit: 3,
    };

    if (rawPassword !== "") {
      poolConfig.password = rawPassword;
    }

    legacyDbPool = mysql.createPool(poolConfig);
  }

  return legacyDbPool;
};

const getLegacyUanFromConnection = async (connection, applicationId) => {
  if (!(await tableExistsInConnection(connection, LEGACY_APPLICATION_TABLE))) return "";

  const [rows] = await connection.execute(
    `SELECT uan_number
     FROM ${LEGACY_APPLICATION_TABLE}
     WHERE application_id = ?
     LIMIT 1`,
    [applicationId]
  );

  return rows[0]?.uan_number || "";
};

const getSavedUanByMobile = async (mobile) => {
  const normalizedMobile = normalizeMobile(mobile);
  if (!/^[6-9]\d{9}$/.test(normalizedMobile)) return "";

  await ensureColumns([["uan_number", "varchar(20) NULL"]]);

  const [rows] = await db.execute(
    `SELECT uan_number
     FROM ${APPLICATION_TABLE}
     WHERE (mobile = ? OR mobile = ? OR mobile = ?)
       AND uan_number IS NOT NULL
       AND uan_number <> ''
     ORDER BY last_activity_at DESC, id DESC
     LIMIT 1`,
    [normalizedMobile, `91${normalizedMobile}`, `+91${normalizedMobile}`]
  );

  return normalizeUanNumber(rows[0]?.uan_number);
};

export const saveApplicationUanById = async (id, uanNumber) => {
  if (!id) throw badRequest("Application ID is required");

  const normalizedUan = normalizeUanNumber(uanNumber);
  if (!normalizedUan) return "";

  await ensureColumns([["uan_number", "varchar(20) NULL"]]);

  const [result] = await db.execute(
    `UPDATE ${APPLICATION_TABLE}
     SET uan_number = ?, last_activity_at = NOW()
     WHERE id = ? OR application_id = ?`,
    [normalizedUan, id, id]
  );

  if (result.affectedRows === 0) {
    throw badRequest("Application not found");
  }

  return normalizedUan;
};

const syncApplicationUan = async (application, lookupId) => {
  if (!application) return null;

  const applicationId = lookupId || application.application_id || application.id;

  const savedUanNumber = await getSavedUanByMobile(application.mobile);
  if (savedUanNumber) {
    return saveApplicationUanById(applicationId, savedUanNumber);
  }

  const legacyUanNumber = await getLegacyUanByApplicationId(application.application_id || applicationId);
  if (legacyUanNumber) {
    return saveApplicationUanById(applicationId, legacyUanNumber);
  }

  const uanNumber = await fetchUanByMobile(application.mobile).catch((error) => {
    console.error("UAN lookup error:", error);
    return "";
  });

  if (uanNumber) {
    return saveApplicationUanById(applicationId, uanNumber);
  }

  return null;
};

const tableExistsInConnection = async (connection, tableName) => {
  const [rows] = await connection.execute(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  );

  return rows.length > 0;
};

export const updateApplication = async (id, data) => {
  if (!id) throw badRequest("Application ID is required for update");

  await ensureApplicationTable();

  if (
    Object.prototype.hasOwnProperty.call(data, "uan_number") ||
    Object.prototype.hasOwnProperty.call(data, "uanNumber")
  ) {
    await ensureColumns([["uan_number", "varchar(20) NULL"]]);
  }

  if (Object.prototype.hasOwnProperty.call(data, "video_kyc")) {
    await ensureColumns([["video_kyc", "varchar(255) NULL"]]);
  }

  if (Object.prototype.hasOwnProperty.call(data, "selfie_photo")) {
    await ensureColumns([["selfie_photo", "varchar(255) NULL"]]);
  }

  if (Object.prototype.hasOwnProperty.call(data, "salary_slip_current")) {
    await ensureColumns([["salary_slip_current", "varchar(255) NULL"]]);
  }

  if (data.current_step === "video_kyc_completed" || Object.prototype.hasOwnProperty.call(data, "submit_at")) {
    await ensureColumns([["submit_at", "datetime NULL"]]);
    data.submit_at = data.submit_at || new Date();
  }

  const fieldMap = {
    employment: "employment_status",
    salary: "monthly_income",
    phone: "mobile",
    pan: "pan_number",
    email: "email",
    name: "full_name",
    fullName: "full_name",
    uanNumber: "uan_number",
    dob: "dob",
    pincode: "pincode",
    city: "city",
  };

  const requestedEntries = Object.entries(data)
    .filter(([field]) => field !== "termsAccepted")
    .map(([field, value]) => [fieldMap[field] || field, value]);

  const [existingColumns] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [APPLICATION_TABLE]
  );
  const validColumns = new Set(existingColumns.map((column) => column.COLUMN_NAME));
  const entries = requestedEntries.filter(([field]) => validColumns.has(field));

  if (entries.length === 0) return null;

  const setClause = entries.map(([field]) => `${field} = ?`).join(", ");
  const values = [...entries.map(([, value]) => value), id];

  const [result] = await db.execute(
    `UPDATE ${APPLICATION_TABLE}
     SET ${setClause}, last_activity_at = NOW()
     WHERE id = ? OR application_id = ?`,
    [...values, id]
  );

  return result;
};

export const getApplicationById = async (id) => {
  if (!id) throw badRequest("Application ID is required");

  await ensureApplicationTable();

  const [rows] = await db.execute(
    `SELECT *
     FROM ${APPLICATION_TABLE}
     WHERE id = ? OR application_id = ?
     LIMIT 1`,
    [id, id]
  );

  return rows[0] || null;
};

export const getRepaymentContactByPan = async (pan) => {
  const normalizedPan = String(pan || "").trim().toUpperCase();

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)) {
    throw badRequest("Enter a valid PAN number");
  }

  await ensureApplicationTable();

  const [rows] = await db.execute(
    `SELECT id, application_id, mobile, email
     FROM ${APPLICATION_TABLE}
     WHERE pan_number = ?
     ORDER BY last_activity_at DESC, submit_at DESC, id DESC
     LIMIT 1`,
    [normalizedPan]
  );

  const application = rows[0];

  if (!application) {
    const error = new Error("No loan application found for this PAN");
    error.statusCode = 404;
    throw error;
  }

  if (!application.mobile && !application.email) {
    throw badRequest("Registered mobile or email is not available for this PAN");
  }

  return {
    applicationId: application.application_id,
    phone: application.mobile || "",
    email: application.email || "",
  };
};

export const getApplicationUanById = async (id) => {
  if (!id) throw badRequest("Application ID is required");

  await ensureColumns([["uan_number", "varchar(20) NULL"]]);

  const [rows] = await db.execute(
    `SELECT id, application_id, mobile, uan_number
     FROM ${APPLICATION_TABLE}
     WHERE id = ? OR application_id = ?
     LIMIT 1`,
    [id, id]
  );

  const application = rows[0];
  if (!application) return null;

  const existingUanNumber = normalizeUanNumber(application.uan_number);
  if (existingUanNumber) return existingUanNumber;

  return syncApplicationUan(application, id);
};

export const createHeroLead = async (data) => {
  const mobile = String(data.mobile || data.phone || "").replace(/\D/g, "");

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw badRequest("Invalid mobile number");
  }

  if (!(await tableExists(HERO_LEADS_TABLE))) {
    await db.execute(
      `CREATE TABLE ${HERO_LEADS_TABLE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mobile VARCHAR(15) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  }

  const [result] = await db.execute(
    `INSERT INTO ${HERO_LEADS_TABLE} (mobile) VALUES (?)`,
    [mobile]
  );

  return {
    id: result.insertId,
    mobile,
  };
};

export const createContactQuery = async (data) => {
  const fullName = String(data.fullName || data.name || "").trim();
  const mobile = String(data.mobile || data.phone || "").replace(/\D/g, "");
  const email = String(data.email || "").trim().toLowerCase();
  const message = String(data.message || "").trim();

  if (!fullName) throw badRequest("Full name is required");
  if (!/^[6-9]\d{9}$/.test(mobile)) throw badRequest("Invalid mobile number");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw badRequest("Valid email is required");

  if (!(await tableExists(CONTACT_QUERIES_TABLE))) {
    await db.execute(
      `CREATE TABLE ${CONTACT_QUERIES_TABLE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(15) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  }

  const [columns] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = 'email'`,
    [CONTACT_QUERIES_TABLE]
  );

  if (columns.length === 0) {
    await db.execute(
      `ALTER TABLE ${CONTACT_QUERIES_TABLE}
       ADD COLUMN email VARCHAR(255) NOT NULL AFTER mobile`
    );
  }

  const [result] = await db.execute(
    `INSERT INTO ${CONTACT_QUERIES_TABLE}
      (full_name, mobile, email, message)
     VALUES (?, ?, ?, ?)`,
    [fullName, mobile, email, message || null]
  );

  return {
    id: result.insertId,
    fullName,
    mobile,
    email,
  };
};

export const updateWorkDetails = async (id, data) => {
  if (!id) throw badRequest("Application ID is required for update");

  await ensureApplicationTable();

  await ensureColumns([
    ["company_name", "varchar(255) NULL"],
    ["designation", "varchar(255) NULL"],
    ["office_email", "varchar(255) NULL"],
    ["salary_day", "int NULL"],
    ["office_address", "text NULL"],
    ["office_pincode", "varchar(10) NULL"],
    ["education", "varchar(100) NULL"],
    ["experience_years", "int NULL"],
  ]);

  const company = String(data.company || data.company_name || "").trim();
  const designation = String(data.designation || "").trim();
  const officeEmail = String(data.email || data.office_email || "").trim();
  const salaryDay = Number(data.salaryDay || data.salary_day || data.salaryDate);
  const officeAddress = String(data.address || data.office_address || "").trim();
  const officePincode = String(data.pincode || data.office_pincode || "").replace(/\D/g, "").slice(0, 6);
  const education = String(data.education || "").trim();
  const experienceYears = Number(data.experience || data.experience_years);

  if (!company) throw badRequest("Company name is required");
  if (!designation) throw badRequest("Designation is required");
  if (officeEmail && !/^\S+@\S+\.\S+$/.test(officeEmail)) throw badRequest("Valid office email is required");
  if (!Number.isInteger(salaryDay) || salaryDay < 1 || salaryDay > 31) {
    throw badRequest("Salary day must be between 1 and 31");
  }
  if (!officeAddress) throw badRequest("Office address is required");
  if (!/^\d{6}$/.test(officePincode)) throw badRequest("Valid office pincode is required");
  if (!education) throw badRequest("Education is required");
  if (!Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 50) {
    throw badRequest("Experience must be between 0 and 50 years");
  }

  const [result] = await db.execute(
    `UPDATE ${APPLICATION_TABLE}
     SET company_name = ?,
         designation = ?,
         office_email = ?,
         salary_day = ?,
         office_address = ?,
         office_pincode = ?,
         education = ?,
         experience_years = ?,
         current_step = 'bank_details',
         last_activity_at = NOW()
     WHERE id = ? OR application_id = ?`,
    [
      company,
      designation,
      officeEmail,
      salaryDay,
      officeAddress,
      officePincode,
      education,
      experienceYears,
      id,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    throw badRequest("Application not found");
  }

  return result;
};

export const updateBankDetails = async (id, data) => {
  if (!id) throw badRequest("Application ID is required for update");

  await ensureApplicationTable();

  const ifsc = String(data.ifsc || data.ifsc_code || "").trim().toUpperCase();
  const bankName = String(data.bankName || data.bank_name || "").trim();
  const branchName = String(data.branchName || data.branch_name || "").trim();
  const accountHolder = String(data.holderName || data.account_holder || "").trim();
  const accountNumber = String(data.accountNumber || data.account_number || "").replace(/\D/g, "");

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw badRequest("Invalid IFSC format");
  if (!bankName) throw badRequest("Bank name is required");
  if (!branchName) throw badRequest("Branch name is required");
  if (!accountHolder) throw badRequest("Account holder name is required");
  if (!/^[A-Za-z\s]+$/.test(accountHolder)) throw badRequest("Only alphabets allowed in holder name");
  if (!/^\d{9,18}$/.test(accountNumber)) throw badRequest("Enter 9-18 digit valid account number");

  const [result] = await db.execute(
    `UPDATE ${APPLICATION_TABLE}
     SET bank_name = ?,
         branch_name = ?,
         account_holder = ?,
         account_number = ?,
         ifsc_code = ?,
         current_step = 'references',
         last_activity_at = NOW()
     WHERE id = ? OR application_id = ?`,
    [bankName, branchName, accountHolder, accountNumber, ifsc, id, id]
  );

  if (result.affectedRows === 0) {
    throw badRequest("Application not found");
  }

  return result;
};

export const updateReferenceDetails = async (id, data) => {
  if (!id) throw badRequest("Application ID is required for update");

  await ensureColumns([
    ["reference1_name", "varchar(255) NULL"],
    ["reference1_mobile", "varchar(15) NULL"],
    ["reference1_relation", "varchar(100) NULL"],
    ["reference2_name", "varchar(255) NULL"],
    ["reference2_mobile", "varchar(15) NULL"],
    ["reference2_relation", "varchar(100) NULL"],
  ]);

  const reference1Name = String(data.reference1Name || data.reference1_name || "").trim();
  const reference1Mobile = String(data.reference1Mobile || data.reference1_mobile || "").replace(/\D/g, "");
  const reference1Relation = String(data.reference1Relation || data.reference1_relation || "").trim();
  const reference2Name = String(data.reference2Name || data.reference2_name || "").trim();
  const reference2Mobile = String(data.reference2Mobile || data.reference2_mobile || "").replace(/\D/g, "");
  const reference2Relation = String(data.reference2Relation || data.reference2_relation || "").trim();

  if (!reference1Name) throw badRequest("Reference 1 name is required");
  if (!/^[6-9]\d{9}$/.test(reference1Mobile)) throw badRequest("Reference 1 mobile number is invalid");
  if (!reference1Relation) throw badRequest("Reference 1 relation is required");
  if (!reference2Name) throw badRequest("Reference 2 name is required");
  if (!/^[6-9]\d{9}$/.test(reference2Mobile)) throw badRequest("Reference 2 mobile number is invalid");
  if (!reference2Relation) throw badRequest("Reference 2 relation is required");

  const [result] = await db.execute(
    `UPDATE ${APPLICATION_TABLE}
     SET reference1_name = ?,
         reference1_mobile = ?,
         reference1_relation = ?,
         reference2_name = ?,
         reference2_mobile = ?,
         reference2_relation = ?,
         current_step = 'upload_docs',
         last_activity_at = NOW()
     WHERE id = ? OR application_id = ?`,
    [
      reference1Name,
      reference1Mobile,
      reference1Relation,
      reference2Name,
      reference2Mobile,
      reference2Relation,
      id,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    throw badRequest("Application not found");
  }

  return result;
};

export const createApplication = async (data) => {
  await ensureApplicationTable();
  await ensureColumns([
    ["submit_at", "datetime NULL"],
    ["uan_number", "varchar(20) NULL"],
  ]);

  const employment = data.employment || data.employment_status;
  const salary = data.salary ?? data.monthly_income;
  const phone = data.phone || data.mobile;
  const pan = data.pan || data.pan_number;
  const email = data.email;
  const termsAccepted = data.termsAccepted ?? data.terms_accepted;

  const missingFields = [];
  if (!employment) missingFields.push("employment");
  if (salary == null || salary === "") missingFields.push("salary");
  if (!phone) missingFields.push("phone");

  if (missingFields.length > 0) {
    throw badRequest(`Missing required fields: ${missingFields.join(", ")}`);
  }

  if (!termsAccepted) {
    throw badRequest("Terms must be accepted");
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const phoneRegex = /^[6-9]\d{9}$/;

  if (pan && !panRegex.test(pan)) {
    throw badRequest("Invalid PAN");
  }

  if (!phoneRegex.test(phone)) {
    throw badRequest("Invalid Phone");
  }

  const applicationId = `WAQTMN-PD-${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 90 + 10)}`;

  const [result] = await db.execute(
    `INSERT INTO ${APPLICATION_TABLE}
      (application_id, loan_type, mobile, email, pan_number, uan_number, employment_status, monthly_income, current_step, submit_at, last_activity_at)
     VALUES (?, 'payday', ?, ?, ?, ?, ?, ?, 'basic_details', NOW(), NOW())`,
    [applicationId, phone, email || null, pan || null, null, employment, salary]
  );

  let uanNumber = "";
  if (process.env.UAN_LOOKUP_SYNC_ON_APPLY === "true") {
    uanNumber = await getApplicationUanById(applicationId).catch((error) => {
      console.error("UAN lookup error:", error);
      return "";
    });
  } else if (process.env.UAN_LOOKUP_BACKGROUND_ON_APPLY === "true") {
    setTimeout(() => getApplicationUanById(applicationId).catch((error) => {
      console.error("Background UAN lookup error:", error.message);
    }), 0);
  }

  return {
    id: result.insertId,
    applicationId,
    employment,
    salary,
    phone,
    pan: pan || null,
    uan_number: uanNumber || null,
    uanNumber: uanNumber || null,
  };
};
