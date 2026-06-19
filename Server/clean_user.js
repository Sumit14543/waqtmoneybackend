import db from "./src/configs/db.js";
import logger from "./src/utils/logger.js";

const mobileArg = process.argv[2];

if (!mobileArg) {
  console.log("Usage: node clean_user.js <10-digit-mobile-number>");
  process.exit(1);
}

const mobile = String(mobileArg).replace(/\D/g, "").slice(-10);
if (!/^[6-9]\d{9}$/.test(mobile)) {
  console.error("Error: Please provide a valid 10-digit mobile number.");
  process.exit(1);
}

const TABLES = {
  applications: {
    name: "waqt_money_loan_applications",
    phoneColumn: "mobile",
  },
  users: {
    name: "users",
    phoneColumn: "mobile",
  },
  hero_leads: {
    name: "waqt_money_hero_leads",
    phoneColumn: "mobile",
  },
  crm_applications: {
    name: "loan_applications",
    phoneColumn: "mobile",
  }
};

async function cleanUser() {
  console.log(`Starting database cleanup for mobile number: ${mobile}`);
  
  try {
    for (const [key, config] of Object.entries(TABLES)) {
      // Check if table exists
      const [tableExists] = await db.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [config.name]
      );
      
      if (tableExists.length === 0) {
        console.log(`Table ${config.name} does not exist. Skipping.`);
        continue;
      }
      
      // Select count of matching records
      const [rows] = await db.execute(
        `SELECT COUNT(*) as count FROM ${config.name} WHERE ${config.phoneColumn} = ?`,
        [mobile]
      );
      
      const count = rows[0]?.count || 0;
      console.log(`Found ${count} records in ${config.name}.`);
      
      if (count > 0) {
        const [delResult] = await db.execute(
          `DELETE FROM ${config.name} WHERE ${config.phoneColumn} = ?`,
          [mobile]
        );
        console.log(`Successfully deleted ${delResult.affectedRows} records from ${config.name}.`);
      }
    }
    
    console.log("Database cleanup completed successfully!");
  } catch (error) {
    console.error("An error occurred during database cleanup:", error.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

cleanUser();
