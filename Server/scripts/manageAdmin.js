import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "waqtmoney",
  port: Number(process.env.DB_PORT || 3306),
};

const getDb = async () => {
  return await mysql.createConnection(poolConfig);
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const main = async () => {
  const [,, command, arg1, arg2] = process.argv;

  if (!command || command === "help") {
    console.log(`
WaqtMoney Admin Management Utility
-----------------------------------
Usage:
  node scripts/manageAdmin.js list
  node scripts/manageAdmin.js add <email> <password>
  node scripts/manageAdmin.js reset-password <email> <new_password>
  node scripts/manageAdmin.js hash <password>
    `);
    process.exit(0);
  }

  if (command === "hash") {
    if (!arg1) {
      console.error("Please provide a password to hash.");
      process.exit(1);
    }
    const hash = await hashPassword(arg1);
    console.log(`Bcrypt Hash: ${hash}`);
    process.exit(0);
  }

  const conn = await getDb();

  try {
    // Ensure table exists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS waqt_admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        is_active TINYINT(1) DEFAULT 1,
        last_login_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    if (command === "list") {
      const [rows] = await conn.execute(
        "SELECT id, email, role, is_active, last_login_at, created_at FROM waqt_admin_users"
      );
      console.log("\nRegistered Admin Users:");
      console.table(rows);
    } else if (command === "add") {
      const email = String(arg1 || "").trim().toLowerCase();
      const password = String(arg2 || "").trim();

      if (!email || !password) {
        console.error("Usage: node scripts/manageAdmin.js add <email> <password>");
        process.exit(1);
      }

      const hash = await hashPassword(password);
      await conn.execute(
        "INSERT INTO waqt_admin_users (email, password_hash, role, is_active) VALUES (?, ?, 'admin', 1) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1",
        [email, hash]
      );
      console.log(`Admin user '${email}' added/updated successfully with Bcrypt hash.`);
    } else if (command === "reset-password") {
      const email = String(arg1 || "").trim().toLowerCase();
      const password = String(arg2 || "").trim();

      if (!email || !password) {
        console.error("Usage: node scripts/manageAdmin.js reset-password <email> <new_password>");
        process.exit(1);
      }

      const hash = await hashPassword(password);
      const [result] = await conn.execute(
        "UPDATE waqt_admin_users SET password_hash = ? WHERE email = ?",
        [hash, email]
      );

      if (result.affectedRows === 0) {
        console.warn(`No user found with email '${email}'.`);
      } else {
        console.log(`Password for '${email}' reset successfully.`);
      }
    }
  } catch (err) {
    console.error("Error executing command:", err.message);
  } finally {
    await conn.end();
  }
};

main();
