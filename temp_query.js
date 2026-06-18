import mysql from "mysql2/promise";

async function run() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: "localhost",
      port: 3306,
      user: "root",
      password: ""
    });
    
    const dbName = "waqt_money";
    await connection.query(`USE \`${dbName}\``);
    
    const [rows] = await connection.query(
      "SELECT * FROM loan_applications WHERE mobile LIKE ?",
      ["%9761811212%"]
    );
    console.log("Matching rows in loan_applications:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.end();
  }
}
run();
