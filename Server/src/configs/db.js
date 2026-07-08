import mysql from "mysql2/promise";
import "./env.js";
import logger from "../utils/logger.js";

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

const db = mysql.createPool(poolConfig);

(async () => {
  try {
    const connection = await db.getConnection();
    logger.info(
      `MySQL connection established: ${poolConfig.user}@${poolConfig.host}/${poolConfig.database}`,
    );
    connection.release();
  } catch (error) {
    logger.error("MySQL connection failed:", formatDbError(error));
  }
})();

export default db;
