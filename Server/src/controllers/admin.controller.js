import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "../configs/db.js";
import { getJwtSecret } from "../configs/secrets.js";

const APPLICATION_TABLE = "waqt_money_loan_applications";
const HERO_LEADS_TABLE = "waqt_money_hero_leads";
const CONTACT_QUERIES_TABLE = "waqt_money_contact_queries";
const BLOGS_TABLE = "waqt_money_blogs";

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

export const adminLogin = async (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  // Check rate limit
  const rateLimitStatus = checkRateLimit(clientIp);
  if (rateLimitStatus.blocked) {
    return res.status(429).json({
      success: false,
      message: `Too many failed login attempts. IP blocked for ${rateLimitStatus.remainingMins} minutes for security.`,
    });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  const expectedUser = (process.env.ADMIN_USER || "waqtadminwaqtmoney.com").trim();
  const expectedPass = (process.env.ADMIN_PASS || "waqt#@#@1212@@").trim();
  const hashedPass = process.env.ADMIN_HASHED_PASS;

  let isMatch = false;

  if (hashedPass) {
    isMatch = (username === expectedUser) && await bcrypt.compare(password, hashedPass);
  } else {
    isMatch = (username === expectedUser) && (password === expectedPass);
  }

  if (isMatch) {
    clearAttempts(clientIp);

    const token = jwt.sign(
      { username, role: "admin", loginTime: Date.now() },
      getJwtSecret(),
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      success: true,
      message: "Admin authentication successful",
      token,
      username,
    });
  }

  recordFailedAttempt(clientIp);

  return res.status(401).json({
    success: false,
    message: "Invalid administrator credentials",
  });
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
