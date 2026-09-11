import "./env.js";
import nodemailer from "nodemailer";

const smtpHost = (process.env.SMTP_HOST || "localhost").trim();
const smtpUser = (process.env.SMTP_USER || process.env.SMTP_USERNAME || "sanction@waqtmoney.com").trim();
const smtpPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "Waqt@@825792##").trim();
const smtpPort = Number.parseInt(process.env.SMTP_PORT || "8081", 10);
const smtpSecure = (process.env.SMTP_SECURE || "").trim().toLowerCase();
const smtpTlsServername = process.env.SMTP_TLS_SERVERNAME?.trim() || smtpHost;
const smtpAddressFamily = Number.parseInt(process.env.SMTP_ADDRESS_FAMILY || "0", 10);
const rejectUnauthorized = process.env.SMTP_REJECT_UNAUTHORIZED === "true";

if (!smtpHost || !smtpUser || !smtpPass || Number.isNaN(smtpPort)) {
  throw new Error(
    "Invalid SMTP configuration. Ensure SMTP_HOST, SMTP_PORT, SMTP_USER/SMTP_USERNAME, and SMTP_PASS/SMTP_PASSWORD are set.",
  );
}

// secure is ONLY true for implicit SSL (port 465 or explicit 'ssl').
// For ports like 8081, 587, 25, secure MUST be false to avoid OpenSSL 'packet length too long' errors.
const isImplicitSsl = smtpPort === 465 || smtpSecure === "ssl";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: isImplicitSsl,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    servername: smtpTlsServername,
    rejectUnauthorized: rejectUnauthorized,
  },
  ...(smtpAddressFamily === 4 || smtpAddressFamily === 6
    ? { family: smtpAddressFamily }
    : {}),
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

export default transporter;
