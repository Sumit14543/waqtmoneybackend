import db from "../configs/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../configs/secrets.js";
import { createSanctionLetterPdf } from "../services/sanctionLetter.service.js";

const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(0, 10);
const APPLICATION_TABLE = "waqt_money_loan_applications";
let usersTableReady = false;

const createToken = (user) =>
  jwt.sign(
    { id: user.id, mobile: user.mobile },
    getJwtSecret(),
    { expiresIn: "7d" }
  );

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
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
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

const formatLoanStatus = (application) => {
  const status = String(application.status || "").trim().toLowerCase();
  const currentStep = String(application.current_step || "").trim().toLowerCase();

  if (["closed", "paid", "completed"].includes(status)) return "Closed";
  if (["rejected", "failed", "cancelled"].includes(status)) return "Rejected";
  if (status === "approved" || currentStep === "loan_status") return "Active";
  if (currentStep.includes("kyc") || currentStep.includes("verify")) return "Under Review";
  return status ? status.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "In Progress";
};

const calculateRepaymentAmount = (application) => {
  const amount = Number(application.loan_amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;

  return Math.round(amount * 1.27);
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

    const [existingUsers] = await db.query("SELECT * FROM users WHERE mobile=?", [mobile]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Mobile number already registered" });
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

    res.json({
      message: "Signup successful",
      token: createToken(user),
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    res.json({
      message: "Login success",
      token: createToken(user[0]),
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        mobile: user[0].mobile,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

    const [loans] = await db.query(
      `SELECT id, application_id, loan_amount, status, current_step, submit_at, created_at, updated_at
       FROM ${APPLICATION_TABLE}
       WHERE mobile = ? OR mobile = ? OR mobile = ?
       ORDER BY last_activity_at DESC, id DESC`,
      [user.mobile, `91${user.mobile}`, `+91${user.mobile}`]
    );

    res.json({
      success: true,
      user,
      data: {
        user,
        credit: {
          score: null,
          label: loans.length > 0 ? "In Review" : "New",
          message:
            loans.length > 0
              ? "Keep repayments on time to improve future eligibility."
              : "Start your first application to build your Waqt Money profile.",
        },
        loans: loans.map((loan) => ({
          id: loan.application_id || `WAQTMN-${loan.id}`,
          status: formatLoanStatus(loan),
          amount: Number(loan.loan_amount || 0),
          repaymentAmount: calculateRepaymentAmount(loan),
          disbursalDate: loan.submit_at || loan.created_at || loan.updated_at,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    const [applications] = await db.query(
      `SELECT *
       FROM ${APPLICATION_TABLE}
       WHERE (application_id = ? OR id = ?)
         AND (mobile = ? OR mobile = ? OR mobile = ?)
       LIMIT 1`,
      [loanId, loanId, user.mobile, `91${user.mobile}`, `+91${user.mobile}`]
    );

    const application = applications[0];
    if (!application) {
      return res.status(404).json({ message: "Loan application not found" });
    }

    const pdf = createSanctionLetterPdf({ application, user });
    const filename = `WaqtMoney-Sanction-Letter-${application.application_id || application.id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdf.length);
    return res.send(pdf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
