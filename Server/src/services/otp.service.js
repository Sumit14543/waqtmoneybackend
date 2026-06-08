import transporter from "../configs/mailer.js";
import logger from "../utils/logger.js";

const otpStore = {};
const attemptStore = {};

const OTP_TTL_MS = 60 * 1000;
const MAX_ACTIVE_OTPS_PER_KEY = 5;
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const MAIL_TIMEOUT_MS = 15000;
const WHATSAPP_TIMEOUT_MS = 15000;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const getWhatsAppAuthKey = () =>
  (
    process.env.AUTH_KEY ||
    process.env.AUTHKEY ||
    process.env.AUTHKEY_API_KEY ||
    process.env.WHATSAPP_AUTH_KEY
  )?.trim();

const isLocalOtpDebugEnabled = () =>
  process.env.NODE_ENV !== "production" ||
  String(process.env.CLIENT_BASE_URL || "").includes("localhost") ||
  String(process.env.API_PUBLIC_BASE_URL || "").includes("localhost");

const getOtpKey = ({ phone, email }) => {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  if (normalizedPhone) return `phone:${normalizedPhone}`;
  if (normalizedEmail) return `email:${normalizedEmail}`;
  return "";
};

const getOtpKeys = ({ phone, email }) => {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);
  const keys = [];

  if (normalizedPhone) keys.push(`phone:${normalizedPhone}`);
  if (normalizedEmail) keys.push(`email:${normalizedEmail}`);

  return keys;
};

const saveOtpForKey = (key, otp, expires) => {
  const existingOtps = Array.isArray(otpStore[key]?.otps)
    ? otpStore[key].otps
    : otpStore[key]?.otp
      ? [{ otp: otpStore[key].otp, expires: otpStore[key].expires }]
      : [];

  const activeOtps = existingOtps
    .filter((record) => Date.now() <= record.expires)
    .concat({ otp, expires })
    .slice(-MAX_ACTIVE_OTPS_PER_KEY);

  otpStore[key] = { otps: activeOtps };
};

const withTimeout = (promise, timeoutMs) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeoutError = new Error("OTP delivery request timed out");
      timeoutError.statusCode = 504;
      reject(timeoutError);
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const sendWhatsAppOtp = async (phone, otp) => {
  const normalizedPhone = normalizePhone(phone);
  const authKey = getWhatsAppAuthKey();
  const wid = process.env.AUTHKEY_OTP_WID?.trim() || "32517";

  if (!normalizedPhone || !authKey) {
    const error = new Error("WhatsApp OTP is not configured");
    error.statusCode = 424;
    throw error;
  }

  const mobile = normalizedPhone.startsWith("91")
    ? normalizedPhone.slice(2)
    : normalizedPhone;

  const url = `https://api.authkey.io/request?${new URLSearchParams({
    authkey: authKey,
    mobile,
    country_code: "91",
    wid,
    "1": String(otp),
  }).toString()}`;

  const response = await withTimeout(fetch(url), WHATSAPP_TIMEOUT_MS);
  const text = await response.text();

  if (!response.ok) {
    const error = new Error(text || "WhatsApp OTP request failed");
    error.statusCode = response.status;
    throw error;
  }

  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (data?.error) {
    const error = new Error(JSON.stringify(data.error));
    error.statusCode = 502;
    throw error;
  }

  return true;
};

const sendEmailOtp = async (email, otp) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    const error = new Error("Email is not available");
    error.statusCode = 424;
    throw error;
  }

  const fromEmail =
    process.env.SMTP_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME;
  const fromName = process.env.SMTP_FROM_NAME || "Waqt Finance";

  const info = await withTimeout(
    transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: normalizedEmail,
      subject: "Your OTP - Waqt Finance",
      html: `
        <div style="max-width:600px;margin:auto;font-family:Arial;background:#f4f6f9;padding:20px">
          <div style="background:#fff;padding:30px;border-radius:10px;text-align:center">
            <h2 style="color:#1d3f8f;margin-bottom:10px">Waqt Finance</h2>
            <p style="font-size:16px">Your One-Time Password</p>
            <div style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:20px 0;color:#000">${otp}</div>
            <p>This OTP is valid for <b>1 minute</b>.</p>
            <p style="font-size:12px;color:#888;margin-top:20px">If you did not request this, please ignore this email.</p>
          </div>
        </div>
      `,
      text: `Your Waqt Finance OTP is ${otp}. It is valid for 1 minute.`,
    }),
    MAIL_TIMEOUT_MS,
  );

  if (info.accepted?.length > 0) {
    return true;
  }

  const error = new Error("Email was not accepted by SMTP server");
  error.statusCode = 502;
  throw error;
};

export const sendOTPService = async ({ phone, email }) => {
  const otpKey = getOtpKey({ phone, email });

  if (!otpKey) {
    const error = new Error("Phone or email is required");
    error.statusCode = 400;
    throw error;
  }

  const now = Date.now();
  if (!attemptStore[otpKey]) {
    attemptStore[otpKey] = { count: 0, firstAttempt: now, blockedUntil: null };
  }

  const userAttempt = attemptStore[otpKey];

  if (userAttempt.blockedUntil && now < userAttempt.blockedUntil) {
    const error = new Error("Too many attempts. Please try again later.");
    error.statusCode = 429;
    throw error;
  }

  if (userAttempt.blockedUntil && now > userAttempt.blockedUntil) {
    userAttempt.count = 0;
    userAttempt.blockedUntil = null;
    userAttempt.firstAttempt = now;
  }

  if (userAttempt.count >= MAX_ATTEMPTS) {
    userAttempt.blockedUntil = now + BLOCK_DURATION_MS;
    const error = new Error("Maximum attempts reached. You are blocked for 15 minutes.");
    error.statusCode = 429;
    throw error;
  }

  userAttempt.count += 1;

  const otp = Math.floor(100000 + Math.random() * 900000);
  const channels = [];
  const warnings = [];

  getOtpKeys({ phone, email }).forEach((key) => {
    saveOtpForKey(key, otp, now + OTP_TTL_MS);
  });

  if (phone && getWhatsAppAuthKey()) {
    try {
      await sendWhatsAppOtp(phone, otp);
      channels.push("WhatsApp");
    } catch (error) {
      warnings.push(`WhatsApp failed: ${error.message}`);
      logger.warn("WhatsApp OTP failed:", error.message);
    }
  }

  try {
    await sendEmailOtp(email, otp);
    channels.push("Email");
  } catch (error) {
    warnings.push(`Email failed: ${error.message}`);
    logger.warn("Email OTP failed:", error.message);
  }

  if (channels.length === 0) {
    getOtpKeys({ phone, email }).forEach((key) => {
      delete otpStore[key];
    });
    const error = new Error("OTP could not be delivered. Please check your email/mobile or try again.");
    error.statusCode = 502;
    error.details = warnings;
    throw error;
  }

  return {
    success: true,
    delivery: channels.length === 2 ? "both" : channels[0].toLowerCase(),
    channels,
    ttl: Math.floor(OTP_TTL_MS / 1000),
    warning: warnings.join(" | ") || undefined,
    debugOtp: isLocalOtpDebugEnabled() ? String(otp) : undefined,
  };
};

export const verifyOTPService = ({ phone, email, otp }) => {
  const otpKeys = getOtpKeys({ phone, email });
  const otpKey = otpKeys.find((key) => otpStore[key]);
  const record = otpKey ? otpStore[otpKey] : null;

  if (!record) {
    return false;
  }

  const now = Date.now();
  const activeOtps = Array.isArray(record.otps)
    ? record.otps.filter((entry) => now <= entry.expires)
    : record.otp && now <= record.expires
      ? [{ otp: record.otp, expires: record.expires }]
      : [];

  if (activeOtps.length === 0) {
    otpKeys.forEach((key) => {
      delete otpStore[key];
    });
    return "expired";
  }

  otpKeys.forEach((key) => {
    if (otpStore[key]) {
      otpStore[key].otps = activeOtps;
    }
  });

  const enteredOtp = String(otp || "").trim();
  const isValid = activeOtps.some((entry) => String(entry.otp) === enteredOtp);

  if (isValid) {
    otpKeys.forEach((key) => {
      delete otpStore[key];
    });

    otpKeys.forEach((key) => {
      if (attemptStore[key]) {
        attemptStore[key].count = 0;
        attemptStore[key].blockedUntil = null;
      }
    });
  }

  return isValid;
};
