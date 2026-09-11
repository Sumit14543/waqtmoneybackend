import "./env.js";
import nodemailer from "nodemailer";

const smtpHost = (process.env.SMTP_HOST || "localhost").trim();
const smtpUser = (process.env.SMTP_USER || process.env.SMTP_USERNAME || "sanction@waqtmoney.com").trim();
const smtpPass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "Waqt@@825792##").trim().replace(/^"|"$/g, "");
const rawPort = Number.parseInt(process.env.SMTP_PORT || "465", 10);
const expressPort = Number.parseInt(process.env.PORT || "5000", 10);
const smtpSecure = (process.env.SMTP_SECURE || "true").trim().toLowerCase();
const smtpTlsServername = process.env.SMTP_TLS_SERVERNAME?.trim() || smtpHost;
const smtpAddressFamily = Number.parseInt(process.env.SMTP_ADDRESS_FAMILY || "0", 10);
const rejectUnauthorized = process.env.SMTP_REJECT_UNAUTHORIZED === "true";

// If SMTP_PORT was set to Express web server port (5000), default to 465 (SSL) or 587 (TLS)
let primaryPort = rawPort;
if (primaryPort === expressPort || primaryPort === 5000) {
  primaryPort = (smtpSecure === "true" || smtpSecure === "ssl" || smtpSecure === "465") ? 465 : 587;
}

if (!smtpHost || !smtpUser || !smtpPass || Number.isNaN(primaryPort)) {
  throw new Error(
    "Invalid SMTP configuration. Ensure SMTP_HOST, SMTP_PORT, SMTP_USER/SMTP_USERNAME, and SMTP_PASS/SMTP_PASSWORD are set.",
  );
}

const createTransporterForPort = (port) => {
  const isImplicitSsl = port === 465 || smtpSecure === "ssl";
  return nodemailer.createTransport({
    host: smtpHost,
    port: port,
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
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 10000,
  });
};

const defaultTransporter = createTransporterForPort(primaryPort);

export const sendMailWithFallback = async (mailOptions) => {
  const candidatePorts = [...new Set([primaryPort, 465, 587, 25])];
  let lastError = null;

  for (const port of candidatePorts) {
    try {
      const transporter = (port === primaryPort) ? defaultTransporter : createTransporterForPort(port);
      const info = await transporter.sendMail(mailOptions);
      if (info && (info.accepted?.length > 0 || info.messageId)) {
        return info;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[SMTP Attempt Failed on Port ${port}]:`, err.message);
    }
  }

  throw lastError || new Error("All SMTP ports (465, 587, 25) failed to deliver email");
};

export default defaultTransporter;
