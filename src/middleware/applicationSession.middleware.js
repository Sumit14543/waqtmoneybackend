import crypto from "crypto";
import fs from "fs/promises";
import { getAppSecret } from "../configs/secrets.js";
import { getApplicationById } from "../services/application.service.js";
import { parseCookies } from "../utils/cookies.js";

export const APPLICATION_SESSION_COOKIE = "application_session";
const APPLICATION_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const isProduction = () => process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

const encodeBase64Url = (value) => Buffer.from(value).toString("base64url");
const signPayload = (payload) =>
  crypto.createHmac("sha256", getAppSecret()).update(payload).digest("base64url");

const getRequestedApplicationId = (req) =>
  String(
    req.params?.id ||
      req.body?.applicationId ||
      req.body?.application_id ||
      req.body?.id ||
      req.query?.applicationId ||
      req.query?.id ||
      "",
  ).trim();

const verifyApplicationSessionToken = (token) => {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signPayload(payload);
  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (session.purpose !== "application" || Number(session.expires || 0) < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
};

export const createApplicationSessionToken = ({ applicationId, mobile = "" }) => {
  const payload = encodeBase64Url(JSON.stringify({
    purpose: "application",
    applicationId: String(applicationId || ""),
    mobile: String(mobile || "").replace(/\D/g, "").slice(-10),
    expires: Date.now() + APPLICATION_SESSION_TTL_MS,
  }));

  return `${payload}.${signPayload(payload)}`;
};

export const setApplicationSessionCookie = (res, { applicationId, mobile = "" }) => {
  res.cookie(APPLICATION_SESSION_COOKIE, createApplicationSessionToken({ applicationId, mobile }), {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: APPLICATION_SESSION_TTL_MS,
    path: "/api",
  });
};

export const requireApplicationSession = (req, res, next) => {
  const requestedApplicationId = getRequestedApplicationId(req);
  const session = verifyApplicationSessionToken(parseCookies(req)[APPLICATION_SESSION_COOKIE]);

  if (!requestedApplicationId || !session?.applicationId) {
    return res.status(401).json({
      success: false,
      message: "Application session expired. Please start again.",
    });
  }

  if (String(session.applicationId) !== requestedApplicationId) {
    return res.status(403).json({
      success: false,
      message: "This application session does not match the request.",
    });
  }

  req.applicationSession = session;
  setApplicationSessionCookie(res, {
    applicationId: session.applicationId,
    mobile: session.mobile,
  });
  return next();
};

const getHeaderValue = (req, name) => String(req.headers[name] || "").trim();
const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizePan = (value) => String(value || "").trim().toUpperCase();
const cleanupUploadedFiles = async (req) => {
  const files = [
    ...(Array.isArray(req.files) ? req.files : []),
    ...(req.file ? [req.file] : []),
  ];

  await Promise.all(
    files
      .map((file) => file?.path)
      .filter(Boolean)
      .map((filePath) => fs.unlink(filePath).catch(() => null))
  );
};

const rejectRecoveredSession = async (req, res, statusCode = 401) => {
  await cleanupUploadedFiles(req);
  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 403
        ? "This application session does not match the request."
        : "Application session expired. Please start again.",
  });
};

export const requireApplicationSessionOrMatchingContact = async (req, res, next) => {
  const requestedApplicationId =
    getRequestedApplicationId(req) || getHeaderValue(req, "x-application-id");
  const session = verifyApplicationSessionToken(parseCookies(req)[APPLICATION_SESSION_COOKIE]);

  if (session?.applicationId) {
    if (!requestedApplicationId || String(session.applicationId) !== requestedApplicationId) {
      return rejectRecoveredSession(req, res, 403);
    }

    req.applicationSession = session;
    setApplicationSessionCookie(res, {
      applicationId: session.applicationId,
      mobile: session.mobile,
    });
    return next();
  }

  if (!requestedApplicationId) {
    return rejectRecoveredSession(req, res);
  }

  const requestMobile = normalizeMobile(
    getHeaderValue(req, "x-application-mobile") || req.body?.applicationMobile
  );
  const requestEmail = normalizeEmail(
    getHeaderValue(req, "x-application-email") || req.body?.applicationEmail
  );
  const requestPan = normalizePan(
    getHeaderValue(req, "x-application-pan") || req.body?.applicationPan
  );

  if (!requestMobile && !requestEmail && !requestPan) {
    return rejectRecoveredSession(req, res);
  }

  try {
    const application = await getApplicationById(requestedApplicationId);
    const applicationMobile = normalizeMobile(application?.mobile);
    const applicationEmail = normalizeEmail(application?.email);
    const applicationPan = normalizePan(application?.pan_number);
    const mobileMatches = requestMobile && applicationMobile && requestMobile === applicationMobile;
    const emailMatches = requestEmail && applicationEmail && requestEmail === applicationEmail;
    const panMatches = requestPan && applicationPan && requestPan === applicationPan;

    if (!application || (!mobileMatches && !emailMatches && !panMatches)) {
      return rejectRecoveredSession(req, res);
    }

    req.applicationSession = {
      applicationId: application.application_id || requestedApplicationId,
      mobile: applicationMobile,
      recovered: true,
    };
    setApplicationSessionCookie(res, {
      applicationId: application.application_id || requestedApplicationId,
      mobile: applicationMobile,
    });
    return next();
  } catch (error) {
    return next(error);
  }
};
