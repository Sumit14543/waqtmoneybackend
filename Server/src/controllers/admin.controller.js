import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "../configs/db.js";
import { getJwtSecret } from "../configs/secrets.js";
import { sendOTPService, verifyOTPService } from "../services/otp.service.js";

const APPLICATION_TABLE = "waqt_money_loan_applications";
const HERO_LEADS_TABLE = "waqt_money_hero_leads";
const CONTACT_QUERIES_TABLE = "waqt_money_contact_queries";
const BLOGS_TABLE = "waqt_money_blogs";

const ALLOWED_ADMIN_DOMAINS = ["waqtfinance.com", "waqtmoney.in"];

const isAllowedAdminDomain = (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2) return false;
  return ALLOWED_ADMIN_DOMAINS.includes(parts[1]);
};

const getAdminUsers = () => {
  return [
    {
      email: (process.env.ADMIN_USER_1_EMAIL || "shivani@waqtfinance.com").trim().toLowerCase(),
      pass: (process.env.ADMIN_USER_1_PASS || "Waqt@shivani@#2016##").trim(),
    },
    {
      email: (process.env.ADMIN_USER_2_EMAIL || "support@waqtmoney.in").trim().toLowerCase(),
      pass: (process.env.ADMIN_USER_2_PASS || "WaqtSupport@2026##").trim(),
    },
  ];
};

const verifyAdminAccount = (email, password) => {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPass = String(password || "").trim();

  if (!isAllowedAdminDomain(cleanEmail)) {
    return { valid: false, reason: "Only official @waqtfinance.com or @waqtmoney.in emails are allowed." };
  }

  const users = getAdminUsers();
  const matchedUser = users.find((u) => u.email === cleanEmail);

  if (!matchedUser) {
    return { valid: false, reason: "Unauthorized admin email address." };
  }

  if (matchedUser.pass !== cleanPass) {
    return { valid: false, reason: "Invalid administrator password." };
  }

  return { valid: true, user: matchedUser };
};

// In-Memory IP Brute Force Rate Limiter for Admin Login
const loginAttempts = new Map();

const checkRateLimit = (ip) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes window
  const maxAttempts = 5;

  const attemptData = loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > attemptData.resetTime) {
    attemptData.count = 0;
    attemptData.resetTime = now + windowMs;
  }

  if (attemptData.count >= maxAttempts) {
    const remainingMins = Math.ceil((attemptData.resetTime - now) / 60000);
    return { blocked: true, remainingMins };
  }

  return { blocked: false, attemptData };
};

const recordFailedAttempt = (ip) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const attemptData = loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };
  attemptData.count += 1;
  loginAttempts.set(ip, attemptData);
};

const clearAttempts = (ip) => {
  loginAttempts.delete(ip);
};

export const adminSendOtp = async (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  const rateLimitStatus = checkRateLimit(clientIp);
  if (rateLimitStatus.blocked) {
    return res.status(429).json({
      success: false,
      message: `Too many failed login attempts. IP blocked for ${rateLimitStatus.remainingMins} minutes for security.`,
    });
  }

  const email = req.body.email || req.body.username;
  const password = req.body.password;
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const verification = verifyAdminAccount(cleanEmail, password);
  if (!verification.valid) {
    recordFailedAttempt(clientIp);
    return res.status(401).json({
      success: false,
      message: verification.reason,
    });
  }

  try {
    const result = await sendOTPService({ email: cleanEmail });
    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${cleanEmail}`,
      data: result,
    });
  } catch (err) {
    if (err.statusCode === 429) {
      return res.status(429).json({ success: false, message: err.message });
    }
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to send OTP to email",
    });
  }
};

export const adminVerifyOtp = async (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  const email = req.body.email || req.body.username;
  const otp = req.body.otp;
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanOtp = String(otp || "").trim();

  if (!cleanEmail || !cleanOtp) {
    return res.status(400).json({
      success: false,
      message: "Email and OTP are required",
    });
  }

  if (!isAllowedAdminDomain(cleanEmail)) {
    return res.status(403).json({
      success: false,
      message: "Only official @waqtfinance.com or @waqtmoney.in emails are authorized.",
    });
  }

  const otpResult = verifyOTPService({ email: cleanEmail, otp: cleanOtp });

  if (otpResult === true) {
    clearAttempts(clientIp);

    const token = jwt.sign(
      { username: cleanEmail, email: cleanEmail, role: "admin", loginTime: Date.now() },
      getJwtSecret(),
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      success: true,
      message: "Admin authentication successful",
      token,
      username: cleanEmail,
      email: cleanEmail,
    });
  }

  if (otpResult === "expired") {
    return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
  }

  recordFailedAttempt(clientIp);
  return res.status(400).json({ success: false, message: "Invalid OTP. Please check and try again." });
};

export const adminLogin = async (req, res) => {
  if (req.body.otp) {
    return adminVerifyOtp(req, res);
  }
  return adminSendOtp(req, res);
};

export const getAdminSummary = async (req, res) => {
  try {
    let applicationsCount = 0;
    let heroLeadsCount = 0;
    let contactsCount = 0;
    let blogsCount = 8;
    let recentLeads = [];
    let loanDistribution = [];

    try {
      const [[appRes]] = await db.query(`SELECT COUNT(*) as total FROM ${APPLICATION_TABLE}`);
      applicationsCount = appRes?.total || 0;
    } catch (e) {}

    try {
      const [[heroRes]] = await db.query(`SELECT COUNT(*) as total FROM ${HERO_LEADS_TABLE}`);
      heroLeadsCount = heroRes?.total || 0;
    } catch (e) {}

    try {
      const [[conRes]] = await db.query(`SELECT COUNT(*) as total FROM ${CONTACT_QUERIES_TABLE}`);
      contactsCount = conRes?.total || 0;
    } catch (e) {}

    try {
      const [[blogRes]] = await db.query(`SELECT COUNT(*) as total FROM ${BLOGS_TABLE}`);
      if (blogRes?.total !== undefined) blogsCount = blogRes.total;
    } catch (e) {}

    try {
      const [leads] = await db.query(
        `SELECT application_id, full_name, loan_type, loan_amount, current_step, created_at FROM ${APPLICATION_TABLE} ORDER BY created_at DESC LIMIT 5`
      );
      recentLeads = leads || [];
    } catch (e) {}

    try {
      const [dist] = await db.query(
        `SELECT loan_type, COUNT(*) as count FROM ${APPLICATION_TABLE} GROUP BY loan_type`
      );
      loanDistribution = dist || [];
    } catch (e) {}

    return res.status(200).json({
      success: true,
      summary: {
        applicationsCount,
        heroLeadsCount,
        contactsCount,
        blogsCount,
        recentLeads,
        loanDistribution,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching admin summary stats",
      error: error.message,
    });
  }
};

const normalizeAndHealLead = (lead) => {
  if (!lead) return lead;

  let targetStep = lead.current_step;
  if (lead.video_kyc || lead.completed_at) {
    targetStep = "video_kyc_completed";
  } else if (lead.salary_slip_current || lead.selfie_photo) {
    if (!["video_kyc_completed", "completed"].includes(lead.current_step)) {
      targetStep = "documents_uploaded";
    }
  } else if (lead.reference1_name || lead.reference2_name) {
    if (!["video_kyc_completed", "completed", "documents_uploaded", "upload_docs"].includes(lead.current_step)) {
      targetStep = "references";
    }
  } else if (lead.bank_name || lead.account_number) {
    if (!["video_kyc_completed", "completed", "documents_uploaded", "upload_docs", "references"].includes(lead.current_step)) {
      targetStep = "bank_details";
    }
  }

  if (targetStep && targetStep !== lead.current_step) {
    db.query(
      `UPDATE ${APPLICATION_TABLE} SET current_step = ?, last_activity_at = NOW() WHERE id = ? OR application_id = ?`,
      [targetStep, lead.id, lead.application_id]
    ).catch(() => {});
    lead.current_step = targetStep;
  }

  return lead;
};

export const getAdminLeads = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "20", 10);
    const page = parseInt(req.query.page || "1", 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;
    const loanType = req.query.loanType || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    try {
      let query = `SELECT * FROM ${APPLICATION_TABLE}`;
      let countQuery = `SELECT COUNT(*) as total FROM ${APPLICATION_TABLE}`;
      const params = [];
      const countParams = [];

      const conditions = [];
      if (search) {
        conditions.push("(mobile LIKE ? OR pan_number LIKE ? OR email LIKE ? OR full_name LIKE ? OR application_id LIKE ?)");
        params.push(search, search, search, search, search);
        countParams.push(search, search, search, search, search);
      }
      if (loanType) {
        conditions.push("loan_type = ?");
        params.push(loanType);
        countParams.push(loanType);
      }
      if (startDate) {
        conditions.push("created_at >= ?");
        const formattedStart = `${startDate} 00:00:00`;
        params.push(formattedStart);
        countParams.push(formattedStart);
      }
      if (endDate) {
        conditions.push("created_at <= ?");
        const formattedEnd = `${endDate} 23:59:59`;
        params.push(formattedEnd);
        countParams.push(formattedEnd);
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(" AND ")}`;
        query += whereClause;
        countQuery += whereClause;
      }

      query += " ORDER BY last_activity_at DESC, created_at DESC, id DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const [[countResult]] = await db.query(countQuery, countParams);
      const [leads] = await db.query(query, params);

      const healedLeads = (leads || []).map(normalizeAndHealLead);

      return res.status(200).json({
        success: true,
        leads: healedLeads,
        totalCount: countResult?.total || 0,
        page,
        limit,
      });
    } catch (dbErr) {
      return res.status(200).json({
        success: true,
        leads: [],
        totalCount: 0,
        page,
        limit,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error listing admin leads",
      error: error.message,
    });
  }
};

export const exportAdminLeads = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : null;
    const loanType = req.query.loanType || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    let query = `SELECT * FROM ${APPLICATION_TABLE}`;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push("(mobile LIKE ? OR pan_number LIKE ? OR email LIKE ? OR full_name LIKE ? OR application_id LIKE ?)");
      params.push(search, search, search, search, search);
    }
    if (loanType) {
      conditions.push("loan_type = ?");
      params.push(loanType);
    }
    if (startDate) {
      conditions.push("created_at >= ?");
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      conditions.push("created_at <= ?");
      params.push(`${endDate} 23:59:59`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += " ORDER BY created_at DESC, id DESC";

    const [leads] = await db.query(query, params);
    const healedLeads = (leads || []).map(normalizeAndHealLead);

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Application ID",
      "Full Name",
      "Email",
      "Mobile",
      "Loan Type",
      "Loan Amount",
      "Monthly Income",
      "PAN Number",
      "Aadhaar Number",
      "Bank Name",
      "Account Number",
      "IFSC Code",
      "Current Step",
      "Created At",
      "Last Activity At",
    ];

    const csvRows = [headers.join(",")];

    for (const lead of healedLeads) {
      const row = [
        escapeCsv(lead.application_id),
        escapeCsv(lead.full_name),
        escapeCsv(lead.email),
        escapeCsv(lead.mobile),
        escapeCsv(lead.loan_type),
        escapeCsv(lead.loan_amount),
        escapeCsv(lead.monthly_income),
        escapeCsv(lead.pan_number),
        escapeCsv(lead.aadhaar_number),
        escapeCsv(lead.bank_name),
        escapeCsv(lead.account_number),
        escapeCsv(lead.ifsc_code),
        escapeCsv(lead.current_step),
        escapeCsv(lead.created_at ? new Date(lead.created_at).toISOString() : ""),
        escapeCsv(lead.last_activity_at ? new Date(lead.last_activity_at).toISOString() : ""),
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");
    const filename = `WaqtMoney_Leads_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error exporting admin leads",
      error: error.message,
    });
  }
};

export const getAdminLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM ${APPLICATION_TABLE} WHERE application_id = ? OR id = ?`,
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Lead application not found",
      });
    }

    const healedLead = normalizeAndHealLead(rows[0]);

    return res.status(200).json({
      success: true,
      lead: healedLead,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error retrieving lead details",
      error: error.message,
    });
  }
};

export const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_step, lead_visible } = req.body;

    const updates = [];
    const params = [];

    if (current_step !== undefined) {
      updates.push("current_step = ?");
      params.push(current_step);
    }
    if (lead_visible !== undefined) {
      updates.push("lead_visible = ?");
      params.push(lead_visible ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update",
      });
    }

    params.push(id);
    await db.query(
      `UPDATE ${APPLICATION_TABLE} SET ${updates.join(", ")} WHERE application_id = ?`,
      params
    );

    return res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating lead status",
      error: error.message,
    });
  }
};

export const getAdminContacts = async (req, res) => {
  try {
    try {
      const [contacts] = await db.query(
        `SELECT * FROM ${CONTACT_QUERIES_TABLE} ORDER BY created_at DESC`
      );

      return res.status(200).json({
        success: true,
        contacts: contacts || [],
      });
    } catch (dbErr) {
      return res.status(200).json({
        success: true,
        contacts: [],
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error listing contact queries",
      error: error.message,
    });
  }
};
