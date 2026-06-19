import db from "./src/configs/db.js";

const mobileArg = process.argv[2];
if (!mobileArg) {
  console.log("Usage: node search_db.js <10-digit-mobile-number>");
  process.exit(1);
}

const mobile = String(mobileArg).replace(/\D/g, "").slice(-10);
if (!/^[6-9]\d{9}$/.test(mobile)) {
  console.error("Error: Please provide a valid 10-digit mobile number.");
  process.exit(1);
}

async function searchAllTables() {
  console.log(`Scanning database for mobile: ${mobile} (and variants like +91${mobile}, 91${mobile})...\n`);

  try {
    // 1. Get all tables in the database
    const [tables] = await db.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    );

    let matchCount = 0;

    for (const tableRow of tables) {
      const tableName = tableRow.TABLE_NAME;

      // 2. Get all text/varchar columns for this table
      const [columns] = await db.query(
        `SELECT COLUMN_NAME, DATA_TYPE 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      );

      // Filter columns that could contain a phone number
      const searchableColumns = columns.filter(col => {
        const type = col.DATA_TYPE.toLowerCase();
        return type.includes("char") || type.includes("text") || type.includes("int") || col.COLUMN_NAME.toLowerCase().includes("phone") || col.COLUMN_NAME.toLowerCase().includes("mobile");
      });

      if (searchableColumns.length === 0) continue;

      // 3. Construct a query to search all candidate columns in the table
      const conditions = [];
      const queryParams = [];

      for (const col of searchableColumns) {
        const colName = col.COLUMN_NAME;
        conditions.push(`CAST(\`${colName}\` AS CHAR) LIKE ?`);
        queryParams.push(`%${mobile}%`);
      }

      const sql = `SELECT * FROM \`${tableName}\` WHERE ${conditions.join(" OR ")} LIMIT 10`;
      
      try {
        const [rows] = await db.query(sql, queryParams);
        if (rows.length > 0) {
          console.log(`\x1b[36m[MATCH] Table: ${tableName}\x1b[0m`);
          console.log(`Columns searched: ${searchableColumns.map(c => c.COLUMN_NAME).join(", ")}`);
          console.log(`Found ${rows.length} matching rows:`);
          rows.forEach((row, index) => {
            console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
          });
          console.log("-".repeat(60));
          matchCount += rows.length;
        }
      } catch (err) {
        // Skip tables/views that might fail due to syntax/permissions
      }
    }

    if (matchCount === 0) {
      console.log("\x1b[31mNo matching records found in any table for this phone number.\x1b[0m");
    } else {
      console.log(`\n\x1b[32mScan complete. Found matches in database tables.\x1b[0m`);
    }

  } catch (error) {
    console.error("Scan failed:", error.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

searchAllTables();
