import db from "./src/configs/db.js";
import logger from "./src/utils/logger.js";

const mobileArg = process.argv[2];

if (!mobileArg) {
  console.log("Usage: node diagnose_active_application.js <10-digit-mobile-number>");
  process.exit(1);
}

const mobile = String(mobileArg).replace(/\D/g, "").slice(-10);
if (!/^[6-9]\d{9}$/.test(mobile)) {
  console.error("Error: Please provide a valid 10-digit mobile number.");
  process.exit(1);
}

const INACTIVE_STATUSES = ["rejected", "closed", "cancelled", "deleted", "trash"];

async function diagnose() {
  console.log(`\n=== Diagnosing active applications for mobile: ${mobile} ===\n`);

  try {
    // 1. Check if table loan_applications exists
    const [tables] = await db.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'loan_applications'`
    );

    if (tables.length === 0) {
      console.log("Result: The table 'loan_applications' does NOT exist in the website database.");
      console.log("This means the duplicate check is falling back to the CRM API.");
      console.log("Please check if the CRM API is returning exists: true or if the server was not restarted.");
      process.exit(0);
    }

    console.log("Result: The table 'loan_applications' exists in the website database.");

    // 2. Query all rows for this mobile
    const [rows] = await db.query(
      `SELECT id, status, email, created_at, updated_at FROM \`loan_applications\` WHERE \`mobile\` LIKE ?`,
      [`%${mobile}%`]
    );

    console.log(`Found ${rows.length} record(s) matching mobile: ${mobile} in 'loan_applications' table:`);
    console.log(JSON.stringify(rows, null, 2));

    if (rows.length > 0) {
      const activeRows = rows.filter(row => {
        const status = String(row.status || "").toLowerCase();
        return !INACTIVE_STATUSES.includes(status);
      });

      if (activeRows.length > 0) {
        console.log(`\n[BLOCKED] There are active records blocking application:`);
        console.log(JSON.stringify(activeRows, null, 2));
        console.log(`\nInactive statuses are: ${INACTIVE_STATUSES.join(", ")}`);
        console.log(`The status of the matching record is NOT in the inactive list.`);
      } else {
        console.log(`\n[ALLOWED] All matching records are in inactive statuses (${INACTIVE_STATUSES.join(", ")}).`);
        console.log("This number is NOT blocked by the database table.");
      }
    } else {
      console.log("\n[ALLOWED] No records found in 'loan_applications' table. Not blocked by database.");
    }

  } catch (error) {
    console.error("Diagnosis failed with error:", error.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

diagnose();
