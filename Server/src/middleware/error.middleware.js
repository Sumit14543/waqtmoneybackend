import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";
  logger.error("Error:", isProduction ? err.message : err);

  const isDbConnectionError =
    err?.code === "ECONNREFUSED" ||
    err?.code === "PROTOCOL_CONNECTION_LOST" ||
    err?.fatal === true;

  const statusCode = isDbConnectionError ? 503 : err.statusCode || err.status || 500;

  const response = {
    success: false,
    message: isDbConnectionError
      ? isProduction
        ? "Service temporarily unavailable. Please try again shortly."
        : "Database is not reachable. Please start MySQL and try again."
      : err.message || "Something went wrong",
  };

  if (err.details && !isProduction) {
    response.details = err.details;
  }

  res.status(statusCode).json(response);
};
