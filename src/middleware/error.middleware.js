import logger from "../utils/logger.js";

const ACTIVE_LOAN_APPLICATION_MESSAGE = "You have already applied for a loan.";
const normalizeErrorMessage = (message) => {
  const text = String(message || "").trim();

  if (
    text.toLowerCase().includes("with this number") ||
    text.toLowerCase().includes("with this email") ||
    text.toLowerCase().includes("with this mail")
  ) {
    return text;
  }

  if (
    /already\s+(?:registered|appl(?:y|ied)|have|exist)|different\s+number|active\s+application/i.test(text)
  ) {
    return ACTIVE_LOAN_APPLICATION_MESSAGE;
  }

  return text;
};

export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
  logger.error("Error:", isProduction ? err.message : err);

  const isDbConnectionError =
    err?.code === "ECONNREFUSED" ||
    err?.code === "PROTOCOL_CONNECTION_LOST" ||
    err?.fatal === true;

  const statusCode = isDbConnectionError ? 503 : err.statusCode || err.status || 500;

  const productionMessage =
    statusCode >= 500
      ? "Something went wrong. Please try again shortly."
      : normalizeErrorMessage(err.message) || "Something went wrong";
  const response = {
    success: false,
    message: isDbConnectionError
      ? isProduction
        ? "Service temporarily unavailable. Please try again shortly."
        : "Database is not reachable. Please start MySQL and try again."
      : isProduction
        ? productionMessage
        : normalizeErrorMessage(err.message) || "Something went wrong",
  };

  if (err.details && !isProduction) {
    response.details = err.details;
  }

  res.status(statusCode).json(response);
};
