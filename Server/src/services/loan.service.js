import db from "../configs/db.js";

const APPLICATION_TABLE = "waqt_money_loan_applications";

const buildApplicationLookup = (value) => {
  const lookupValue = String(value || "").trim();

  if (/^\d+$/.test(lookupValue)) {
    return {
      clause: "(id = ? OR application_id = ?)",
      values: [Number(lookupValue), lookupValue],
    };
  }

  return {
    clause: "application_id = ?",
    values: [lookupValue],
  };
};

const ensureLoanApplicationTable = async () => {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS ${APPLICATION_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      application_id VARCHAR(64) NOT NULL UNIQUE,
      mobile VARCHAR(20) NULL,
      loan_amount DECIMAL(12,2) NULL,
      loan_purpose VARCHAR(255) NULL,
      has_running_loan TINYINT(1) DEFAULT 0,
      current_step VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity_at DATETIME NULL
    )`
  );

  const [existingColumns] = await db.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [APPLICATION_TABLE]
  );
  const existingNames = new Set(existingColumns.map((column) => column.COLUMN_NAME));
  const requiredColumns = [
    ["loan_amount", "DECIMAL(12,2) NULL"],
    ["loan_purpose", "VARCHAR(255) NULL"],
    ["has_running_loan", "TINYINT(1) DEFAULT 0"],
    ["current_step", "VARCHAR(100) NULL"],
    ["last_activity_at", "DATETIME NULL"],
  ];

  for (const [name, definition] of requiredColumns) {
    if (!existingNames.has(name)) {
      await db.execute(`ALTER TABLE ${APPLICATION_TABLE} ADD COLUMN ${name} ${definition}`);
    }
  }
};

export const createLoan = async (data) => {
  await ensureLoanApplicationTable();

  const { id, amount, purpose, hasLoan } = data;

  if (id) {
    const lookup = buildApplicationLookup(id);
    const [result] = await db.execute(
      `UPDATE ${APPLICATION_TABLE}
       SET loan_amount = ?, loan_purpose = ?, has_running_loan = ?, current_step = 'loan_requirement', last_activity_at = NOW()
       WHERE ${lookup.clause}`,
      [amount, purpose, hasLoan === "yes" || hasLoan === true ? 1 : 0, ...lookup.values]
    );

    if (result.affectedRows === 0) {
      const error = new Error("Application not found");
      error.statusCode = 400;
      throw error;
    }

    return result;
  }

  const tempApplicationId = `TEMP-LN-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`;

  const [result] = await db.execute(
    `INSERT INTO ${APPLICATION_TABLE}
      (application_id, mobile, loan_amount, loan_purpose, has_running_loan, current_step, last_activity_at)
     VALUES (?, ?, ?, ?, ?, 'loan_requirement', NOW())`,
    [
      tempApplicationId,
      data.phone || "",
      amount,
      purpose,
      hasLoan === "yes" || hasLoan === true ? 1 : 0,
    ]
  );

  const insertId = result.insertId;
  const applicationId = `WAQTMN-LN-${String(insertId).padStart(6, "0")}`;

  await db.execute(
    `UPDATE ${APPLICATION_TABLE} SET application_id = ? WHERE id = ?`,
    [applicationId, insertId]
  );

  return result;
};
