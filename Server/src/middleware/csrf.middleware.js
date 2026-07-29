import crypto from "crypto";

// Store active CSRF tokens in memory with 1-hour expiration
const activeCsrfTokens = new Map();

// Periodically clean up expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of activeCsrfTokens.entries()) {
    if (expiry <= now) activeCsrfTokens.delete(token);
  }
}, 15 * 60 * 1000).unref();

export const generateCsrfToken = (req, res) => {
  const token = crypto.randomBytes(24).toString("hex");
  activeCsrfTokens.set(token, Date.now() + 60 * 60 * 1000); // 1-hour expiration
  return res.status(200).json({
    success: true,
    csrfToken: token
  });
};

export const verifyCsrfToken = (req, res, next) => {
  // Safe HTTP methods do not require CSRF validation
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const path = req.path.toLowerCase();

  // Exclude all third-party webhooks, callbacks, video KYC, selfie, Aadhaar, PAN, and application APIs
  if (
    path.includes("/callback") ||
    path.includes("/webhook") ||
    path.includes("/kyc") ||
    path.includes("/aadhaar") ||
    path.includes("/pan") ||
    path.includes("/upload") ||
    path.includes("/verify") ||
    path.includes("/application") ||
    path.includes("/repayment") ||
    path.includes("/otp")
  ) {
    return next();
  }

  const clientToken = req.headers["x-csrf-token"] || req.headers["x-xsrf-token"];

  if (!clientToken || !activeCsrfTokens.has(clientToken)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Invalid or missing Anti-CSRF security token",
    });
  }

  next();
};
