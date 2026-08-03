import mysql from "mysql2/promise";
import "./env.js";
import logger from "../utils/logger.js";
import { mockBlogsSeed } from "./mockBlogs.js";

const rawDbPassword = process.env.DB_PASSWORD || process.env.DB_PASS || "";
const dbPassword =
  rawDbPassword === "" || rawDbPassword.toLowerCase() === "null"
    ? undefined
    : rawDbPassword;

const poolConfig = {
  host: process.env.DB_HOST?.trim() || "localhost",
  user: process.env.DB_USER?.trim() || "root",
  database: process.env.DB_NAME?.trim() || "database",
  port: Number.parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10),
  queueLimit: Number.parseInt(process.env.DB_QUEUE_LIMIT || "0", 10),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};


const localDbHosts = new Set(["localhost", "127.0.0.1", "::1"]);

const formatDbError = (error) => {
  if (error instanceof Error && error.message) {
    const details = [
      error.code && `code=${error.code}`,
      error.errno && `errno=${error.errno}`,
      error.sqlState && `sqlState=${error.sqlState}`,
      error.sqlMessage && `sqlMessage=${error.sqlMessage}`,
    ].filter(Boolean);

    return details.length > 0 ? `${error.message} (${details.join(", ")})` : error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

if (
  !poolConfig.host ||
  !poolConfig.user ||
  !poolConfig.database ||
  Number.isNaN(poolConfig.port)
) {
  throw new Error(
    "Invalid database configuration. Check DB_HOST, DB_PORT, DB_USER, and DB_NAME.",
  );
}

if (
  process.env.NODE_ENV === "production" &&
  localDbHosts.has(String(poolConfig.host).toLowerCase()) &&
  process.env.ALLOW_LOCAL_DB_IN_PRODUCTION !== "true"
) {
  logger.warn(
    "DB_HOST is localhost in production. This works only when MySQL runs on the same production server.",
  );
}

if (dbPassword !== undefined) {
  poolConfig.password = dbPassword;
}

let db;

if (process.env.BYPASS_DB === "true") {
  logger.warn("Database Bypass Mode is ACTIVE! Returning mock database handlers.");

  const mockLeads = [
    {
      id: 1,
      application_id: "WAQT-LEAD-001",
      loan_type: "Personal",
      mobile: "9876543210",
      email: "rahul.sharma@example.com",
      pan_number: "ABCDE1234F",
      uan_number: "100987654321",
      employment_status: "salaried",
      monthly_income: "45000.00",
      loan_amount: "150000.00",
      loan_purpose: "Home renovation",
      has_running_loan: 0,
      full_name: "Rahul Sharma",
      dob: "1990-05-15",
      pincode: "110001",
      city: "New Delhi",
      company_name: "TCS",
      designation: "Software Engineer",
      office_email: "rahul.s@tcs.com",
      salary_day: 5,
      office_address: "Sector 62, Noida",
      office_pincode: "201301",
      education: "Graduate",
      experience_years: 4,
      bank_name: "HDFC Bank",
      branch_name: "Connaught Place",
      account_holder: "Rahul Sharma",
      account_number: "50100123456789",
      ifsc_code: "HDFC0000003",
      reference1_name: "Vijay Sharma",
      reference1_mobile: "9988776655",
      reference1_relation: "Father",
      reference2_name: "Alok Gupta",
      reference2_mobile: "9876987698",
      reference2_relation: "Friend",
      selfie_photo: "selfie_mock_1.jpg",
      salary_slip_current: "slip_mock_1.pdf",
      video_kyc: "video_mock_1.mp4",
      current_step: "work-details",
      lead_visible: 1,
      created_at: "2026-07-18T10:00:00Z"
    },
    {
      id: 2,
      application_id: "WAQT-LEAD-002",
      loan_type: "Business",
      mobile: "9123456789",
      email: "priya.patel@example.com",
      pan_number: "FGHJK5678L",
      uan_number: "",
      employment_status: "self-employed",
      monthly_income: "85000.00",
      loan_amount: "500000.00",
      loan_purpose: "Working capital",
      has_running_loan: 1,
      full_name: "Priya Patel",
      dob: "1988-11-20",
      pincode: "400001",
      city: "Mumbai",
      company_name: "Patel Enterprises",
      designation: "Proprietor",
      office_email: "priya@patelent.com",
      salary_day: 10,
      office_address: "Andheri East, Mumbai",
      office_pincode: "400069",
      education: "Post Graduate",
      experience_years: 8,
      bank_name: "ICICI Bank",
      branch_name: "Andheri Branch",
      account_holder: "Priya Patel",
      account_number: "000401234567",
      ifsc_code: "ICIC0000004",
      reference1_name: "Karan Patel",
      reference1_mobile: "9111222333",
      reference1_relation: "Spouse",
      reference2_name: "Sonia Rao",
      reference2_mobile: "9222333444",
      reference2_relation: "Colleague",
      selfie_photo: "selfie_mock_2.jpg",
      salary_slip_current: "",
      video_kyc: "",
      current_step: "bank-details",
      lead_visible: 1,
      created_at: "2026-07-18T11:30:00Z"
    },
    {
      id: 3,
      application_id: "WAQT-LEAD-003",
      loan_type: "Payday",
      mobile: "8888877777",
      email: "amit.verma@example.com",
      pan_number: "ZCVBN9876Q",
      uan_number: "100987654322",
      employment_status: "salaried",
      monthly_income: "25000.00",
      loan_amount: "15000.00",
      loan_purpose: "Emergency cash",
      has_running_loan: 0,
      full_name: "Amit Verma",
      dob: "1995-02-28",
      pincode: "560001",
      city: "Bengaluru",
      company_name: "Infosys",
      designation: "Process Associate",
      office_email: "amit.v@infosys.com",
      salary_day: 30,
      office_address: "Electronic City, Bengaluru",
      office_pincode: "560100",
      education: "Graduate",
      experience_years: 2,
      bank_name: "State Bank of India",
      branch_name: "MG Road Branch",
      account_holder: "Amit Verma",
      account_number: "30123456789",
      ifsc_code: "SBIN0000123",
      reference1_name: "Ramesh Verma",
      reference1_mobile: "9333444555",
      reference1_relation: "Brother",
      reference2_name: "Deepak Jha",
      reference2_mobile: "9444555666",
      reference2_relation: "Friend",
      selfie_photo: "selfie_mock_3.jpg",
      salary_slip_current: "slip_mock_3.pdf",
      video_kyc: "video_mock_3.mp4",
      current_step: "completed",
      lead_visible: 1,
      created_at: "2026-07-17T15:20:00Z"
    }
  ];

  const mockContacts = [
    {
      id: 1,
      full_name: "Rajesh Kumar",
      mobile: "9988776655",
      email: "rajesh.k@example.com",
      message: "Having trouble during PAN card verification, it shows name mismatch. Please check my application.",
      created_at: "2026-07-18T18:45:00Z"
    },
    {
      id: 2,
      full_name: "Deepa Shah",
      mobile: "9876543212",
      email: "deepa.shah@example.com",
      message: "Can I pre-close my business loan after 3 months? Are there any prepayment penalty charges?",
      created_at: "2026-07-18T14:12:00Z"
    },
    {
      id: 3,
      full_name: "Vikas Singh",
      mobile: "9123456780",
      email: "vikas.singh@example.com",
  const mockBlogs = mockBlogsSeed.map((b, idx) => ({ id: idx + 1, status: "ACTIVE", ...b }));

  db = {
    async query(sql, params = []) {
      const normalizedSql = sql.toUpperCase();
      
      // BLOG CRUD
      if (normalizedSql.includes("WHERE SLUG = ? OR ID = ?") || normalizedSql.includes("WHERE SLUG = ?")) {
        const key = params[0];
        const key2 = params[1];
        const blog = mockBlogs.find(b => b.slug === key || String(b.id) === String(key) || String(b.id) === String(key2));
        return [blog ? [blog] : []];
      }
      if (normalizedSql.includes("SELECT * FROM WAQT_MONEY_BLOGS WHERE ID = ?")) {
        const id = params[0];
        const blog = mockBlogs.find(b => String(b.id) === String(id));
        return [blog ? [blog] : []];
      }
      if (normalizedSql.includes("SELECT * FROM WAQT_MONEY_BLOGS")) {
        return [mockBlogs];
      }
      if (normalizedSql.includes("INSERT INTO WAQT_MONEY_BLOGS")) {
        // [slug, title, excerpt, content, image, author, category, status, read_time]
        const newBlog = {
          id: mockBlogs.length > 0 ? Math.max(...mockBlogs.map(b => b.id)) + 1 : 1,
          slug: params[0],
          title: params[1],
          excerpt: params[2],
          content: params[3],
          image: params[4] || "/blog-assets/blog-1-personal-loan-guide.webp",
          author: params[5] || "Waqt Financial Expert",
          category: params[6] || "Finance",
          status: params[7] || "ACTIVE",
          read_time: params[8] || "5 Min Read",
          created_at: new Date().toISOString()
        };
        mockBlogs.unshift(newBlog);
        return [{ affectedRows: 1, insertId: newBlog.id }];
      }
      if (normalizedSql.includes("UPDATE WAQT_MONEY_BLOGS SET")) {
        const id = parseInt(params[params.length - 1], 10);
        const idx = mockBlogs.findIndex(b => b.id === id);
        if (idx !== -1) {
          mockBlogs[idx].title = params[0] || mockBlogs[idx].title;
          mockBlogs[idx].slug = params[1] || mockBlogs[idx].slug;
          mockBlogs[idx].category = params[2] || mockBlogs[idx].category;
          mockBlogs[idx].author = params[3] || mockBlogs[idx].author;
          mockBlogs[idx].excerpt = params[4] || mockBlogs[idx].excerpt;
          mockBlogs[idx].content = params[5] || mockBlogs[idx].content;
          if (params[6] !== undefined) mockBlogs[idx].status = params[6];
          if (params[7] !== undefined) mockBlogs[idx].read_time = params[7];
          if (params[8] !== undefined) mockBlogs[idx].image = params[8];
        }
        return [{ affectedRows: 1 }];
      }
      if (normalizedSql.includes("DELETE FROM WAQT_MONEY_BLOGS WHERE ID = ?")) {
        const id = parseInt(params[0], 10);
        const idx = mockBlogs.findIndex(b => b.id === id);
        if (idx !== -1) {
          mockBlogs.splice(idx, 1);
        }
        return [{ affectedRows: 1 }];
      }

      // LEADS & QUERIES CRUD
      if (normalizedSql.includes("SELECT COUNT(*) AS TOTAL FROM WAQT_MONEY_BLOGS")) {
        return [[ { total: mockBlogs.length } ]];
      }
      if (normalizedSql.includes("SELECT COUNT(*) AS TOTAL FROM WAQT_MONEY_LOAN_APPLICATIONS")) {
        return [[ { total: 9954 } ]];
      }
      if (normalizedSql.includes("SELECT COUNT(*) AS TOTAL FROM WAQT_MONEY_HERO_LEADS")) {
        return [[ { total: 328 } ]];
      }
      if (normalizedSql.includes("SELECT COUNT(*) AS TOTAL FROM WAQT_MONEY_CONTACT_QUERIES")) {
        return [[ { total: 142 } ]];
      }
      if (normalizedSql.includes("SELECT * FROM WAQT_MONEY_LOAN_APPLICATIONS WHERE ID = ?")) {
        const app = mockApplications.find(a => String(a.id) === String(params[0]));
        return [app ? [app] : []];
      }
      if (normalizedSql.includes("SELECT * FROM WAQT_MONEY_LOAN_APPLICATIONS")) {
        return [mockApplications];
      }
      if (normalizedSql.includes("SELECT * FROM WAQT_MONEY_HERO_LEADS")) {
        return [mockHeroLeads];
      }
      if (normalizedSql.includes("SELECT * FROM WAQT_MONEY_CONTACT_QUERIES")) {
        return [mockContactQueries];
      }

      return [[]];
    },
    async execute(sql, params = []) {
      return this.query(sql, params);
    },
    async getConnection() {
      return {
        release() {}
      };
    }
  };
} else {
  db = mysql.createPool(poolConfig);
  (async () => {
    try {
      const connection = await db.getConnection();
      logger.info(
        `MySQL connection established: ${poolConfig.user}@${poolConfig.host}/${poolConfig.database}`,
      );

      // Create blogs table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS waqt_money_blogs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          slug VARCHAR(120) NOT NULL UNIQUE,
          title VARCHAR(255) NOT NULL,
          excerpt TEXT NOT NULL,
          content LONGTEXT NOT NULL,
          image VARCHAR(255) NULL,
          author VARCHAR(100) DEFAULT 'Waqt Financial Expert',
          category VARCHAR(100) DEFAULT 'Finance',
          status VARCHAR(20) DEFAULT 'ACTIVE',
          read_time VARCHAR(50) DEFAULT '5 Min Read',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ensure status and read_time columns exist on existing table
      try {
        await connection.execute("ALTER TABLE waqt_money_blogs ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE'");
      } catch (e) {}
      try {
        await connection.execute("ALTER TABLE waqt_money_blogs ADD COLUMN read_time VARCHAR(50) DEFAULT '5 Min Read'");
      } catch (e) {}

      // Only seed default blogs if table is empty
      const [[countRes]] = await connection.execute("SELECT COUNT(*) AS total FROM waqt_money_blogs");
      if (!countRes || countRes.total === 0) {
        logger.info("Seeding default financial articles into waqt_money_blogs table...");
        for (const blog of mockBlogsSeed) {
          await connection.execute(
            "INSERT INTO waqt_money_blogs (slug, title, excerpt, content, image, author, category, status, read_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [blog.slug, blog.title, blog.excerpt, blog.content, blog.image, blog.author, blog.category, "ACTIVE", blog.readTime || "5 Min Read"]
          );
        }
        logger.info("Seeding complete!");
      }

      connection.release();
    } catch (error) {
      logger.error("MySQL connection failed:", formatDbError(error));
    }
  })();
}

export default db;
