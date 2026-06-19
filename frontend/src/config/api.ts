export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://waqt-testing-api.waqtmoney.com/api";

export const ACTIVE_LOAN_APPLICATION_MESSAGE = "You have already applied for a loan.";

export const normalizeApiMessage = (message: unknown, fallback = "Something went wrong") => {
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

  return text || fallback;
};

export const getApiHeaders = (extraHeaders: Record<string, string> = {}) => {
  const headers: Record<string, string> = { ...extraHeaders };

  const id = sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId");
  const phone = sessionStorage.getItem("applyPhone") || localStorage.getItem("applyPhone");
  const email = sessionStorage.getItem("applyEmail") || localStorage.getItem("applyEmail");
  const pan = sessionStorage.getItem("applyPan") || localStorage.getItem("applyPan");
  const token = sessionStorage.getItem("applicationUploadToken") || localStorage.getItem("applicationUploadToken");

  if (id) headers["X-Application-Id"] = id;
  if (phone) headers["X-Application-Mobile"] = phone;
  if (email) headers["X-Application-Email"] = email;
  if (pan) headers["X-Application-Pan"] = pan;
  if (token) headers["X-Application-Upload-Token"] = token;

  return headers;
};
