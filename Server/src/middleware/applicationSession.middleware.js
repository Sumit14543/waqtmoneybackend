import crypto from "crypto";
import fs from "fs/promises";
import { getAppSecret } from "../configs/secrets.js";
import { getApplicationById } from "../services/application.service.js";
import { parseCookies } from "../utils/cookies.js";

export const APPLICATION_SESSION_COOKIE = "application_session";
const APPLICATION_SESSION_TTL_MS = Number(process.env.APPLICATION_SESSION_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const isProduction = () => process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

const encodeBase64Url = (value) => Buffer.from(value).toString("base64url");
const signPayload = (payload) =>
  crypto.createHmac("sha256", getAppSecret()).update(payload).digest("base64url");

const getRequestedApplicationId = (req) =>
  String(
    req.params?.id ||
      req.headers["x-application-id"] ||
      req.body?.applicationId ||
      req.body?.application_id ||
      req.body?.id ||
      req.query?.applicationId ||
      req.query?.id ||
      "",
  ).trim();

const verifySignedApplicationToken = (token, allowedPurposes = ["application"]) => {
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
    if (!allowedPurposes.includes(session.purpose) || Number(session.expires || 0) < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
};

const verifyApplicationSessionToken = (token) => verifySignedApplicationToken(token, ["application"]);

const getCookieValues = (req, cookieName) =>
  String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((values, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return values;

      const name = decodeURIComponent(part.slice(0, separatorIndex).trim());
      if (name !== cookieName) return values;

      values.push(decodeURIComponent(part.slice(separatorIndex + 1).trim()));
      return values;
    }, []);

const getApplicationCookieDomain = () => {
  const configuredDomain = String(
    process.env.APPLICATION_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN || ""
  ).trim();

  if (configuredDomain) {
    return configuredDomain.toLowerCase() === "none" ? undefined : configuredDomain;
  }

  if (!isProduction()) return undefined;

  const candidateUrls = [
    process.env.API_PUBLIC_BASE_URL,
    process.env.CLIENT_BASE_URL,
  ];

  for (const candidateUrl of candidateUrls) {
    try {
      const hostname = new URL(candidateUrl).hostname;
      if (hostname === "waqtmoney.com" || hostname.endsWith(".waqtmoney.com")) {
        return ".waqtmoney.com";
      }
    } catch {
      // Optional URL was missing or malformed; keep checking the next one.
    }
  }

  return undefined;
};

const getApplicationSessionFromRequest = (req, requestedApplicationId = "") => {
  const cookieTokens = getCookieValues(req, APPLICATION_SESSION_COOKIE);
  const parsedCookieToken = parseCookies(req)[APPLICATION_SESSION_COOKIE];
  const tokens = [...new Set([...cookieTokens, parsedCookieToken].filter(Boolean))];
  const sessions = tokens.map(verifyApplicationSessionToken).filter(Boolean);

  if (requestedApplicationId) {
    return sessions.find((session) => String(session.applicationId) === String(requestedApplicationId)) || null;
  }

  return sessions[0] || null;
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

export const createApplicationUploadToken = ({ applicationId }) => {
  const payload = encodeBase64Url(JSON.stringify({
    purpose: "application_upload",
    applicationId: String(applicationId || ""),
    expires: Date.now() + APPLICATION_SESSION_TTL_MS,
  }));

  return `${payload}.${signPayload(payload)}`;
};

export const verifyApplicationUploadToken = (token, applicationId) => {
  const session = verifySignedApplicationToken(token, ["application_upload"]);

  if (
    session?.purpose === "application_upload" &&
    session.applicationId &&
    String(session.applicationId) === String(applicationId || "")
  ) {
    return session;
  }

  return null;
};

export const setApplicationSessionCookie = (res, { applicationId, mobile = "" }) => {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: APPLICATION_SESSION_TTL_MS,
    path: "/api",
  };
  const cookieDomain = getApplicationCookieDomain();

  if (cookieDomain) cookieOptions.domain = cookieDomain;

  res.cookie(APPLICATION_SESSION_COOKIE, createApplicationSessionToken({ applicationId, mobile }), cookieOptions);
};

export const requireApplicationSession = async (req, res, next) => {
  const requestedApplicationId =
    getRequestedApplicationId(req) || getHeaderValue(req, "x-application-id");
  const session = getApplicationSessionFromRequest(req, requestedApplicationId);
  const uploadToken = String(
    req.body?.applicationUploadToken || getHeaderValue(req, "x-application-upload-token")
  ).trim();
  const uploadSession = verifyApplicationUploadToken(uploadToken, requestedApplicationId);

  if (session?.applicationId) {
    if (!requestedApplicationId || String(session.applicationId) !== requestedApplicationId) {
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
  }

  if (uploadSession?.applicationId) {
    req.applicationSession = {
      applicationId: uploadSession.applicationId,
      recovered: true,
      viaUploadToken: true,
    };
    setApplicationSessionCookie(res, {
      applicationId: uploadSession.applicationId,
    });
    return next();
  }

  if (!requestedApplicationId) {
    return res.status(401).json({
      success: false,
      message: "Application session expired. Please start again.",
    });
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
    try {
      const application = await getApplicationById(requestedApplicationId);

      if (isRecentDraftApplication(application) || isActiveDraftApplication(application)) {
        const applicationMobile = normalizeMobile(application.mobile);

        req.applicationSession = {
          applicationId: application.application_id || requestedApplicationId,
          mobile: applicationMobile,
          recovered: true,
          viaRecentDraft: isRecentDraftApplication(application),
          viaDraftApplication: !isRecentDraftApplication(application),
        };
        setApplicationSessionCookie(res, {
          applicationId: application.application_id || requestedApplicationId,
          mobile: applicationMobile,
        });
        return next();
      }
    } catch (error) {
      return next(error);
    }

    return res.status(401).json({
      success: false,
      message: "Application session expired. Please start again.",
    });
  }

  try {
    const application = await getApplicationById(requestedApplicationId);
    const applicationMobile = normalizeMobile(application?.mobile);
    const applicationEmail = normalizeEmail(application?.email);
    const applicationPan = normalizePan(application?.pan_number);
    const mobileMatches = requestMobile && applicationMobile && requestMobile === applicationMobile;
    const emailMatches = requestEmail && applicationEmail && requestEmail === applicationEmail;
    const panMatches = requestPan && applicationPan && requestPan === applicationPan;

    if (!application) {
      return res.status(401).json({
        success: false,
        message: "Application session expired. Please start again.",
      });
    }

    if (!mobileMatches && !emailMatches && !panMatches && !isActiveDraftApplication(application)) {
      return res.status(401).json({
        success: false,
        message: "Application session expired. Please start again.",
      });
    }

    req.applicationSession = {
      applicationId: application.application_id || requestedApplicationId,
      mobile: applicationMobile,
      recovered: true,
      viaDraftApplication: !mobileMatches && !emailMatches && !panMatches,
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

const getHeaderValue = (req, name) => String(req.headers[name] || "").trim();
const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizePan = (value) => String(value || "").trim().toUpperCase();
const DRAFT_UPLOAD_RECOVERY_TTL_MS = Number(
  process.env.DRAFT_UPLOAD_RECOVERY_TTL_MS || 72 * 60 * 60 * 1000
);
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

const isRecentDraftApplication = (application) => {
  if (!application) return false;
  if (Number(application.lead_visible || 0) === 1) return false;
  if (application.completed_at) return false;
  if (application.current_step === "video_kyc_completed") return false;
  if (!application.mobile && !application.email) return false;

  const activityDate = application.last_activity_at || application.created_at;
  const activityTime = activityDate ? new Date(activityDate).getTime() : 0;

  return Number.isFinite(activityTime) && Date.now() - activityTime <= DRAFT_UPLOAD_RECOVERY_TTL_MS;
};

const isActiveDraftApplication = (application) => {
  if (!application) return false;
  if (Number(application.lead_visible || 0) === 1) return false;
  if (application.completed_at) return false;

  const step = String(application.current_step || "").toLowerCase();
  return !["video_kyc_completed", "loan_closed", "rejected", "cancelled"].includes(step);
};

export const requireApplicationSessionOrMatchingContact = async (req, res, next) => {
  const requestedApplicationId =
    getRequestedApplicationId(req) || getHeaderValue(req, "x-application-id");
  const session = getApplicationSessionFromRequest(req, requestedApplicationId);
  const uploadToken = String(
    req.body?.applicationUploadToken || getHeaderValue(req, "x-application-upload-token")
  ).trim();
  const uploadSession = verifyApplicationUploadToken(uploadToken, requestedApplicationId);

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

  if (uploadSession?.applicationId) {
    req.applicationSession = {
      applicationId: uploadSession.applicationId,
      recovered: true,
      viaUploadToken: true,
    };
    setApplicationSessionCookie(res, {
      applicationId: uploadSession.applicationId,
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
    try {
      const application = await getApplicationById(requestedApplicationId);

      if (isRecentDraftApplication(application) || isActiveDraftApplication(application)) {
        const applicationMobile = normalizeMobile(application.mobile);

        req.applicationSession = {
          applicationId: application.application_id || requestedApplicationId,
          mobile: applicationMobile,
          recovered: true,
          viaRecentDraft: isRecentDraftApplication(application),
          viaDraftApplication: !isRecentDraftApplication(application),
        };
        setApplicationSessionCookie(res, {
          applicationId: application.application_id || requestedApplicationId,
          mobile: applicationMobile,
        });
        return next();
      }
    } catch (error) {
      return next(error);
    }

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

    if (!application) {
      return rejectRecoveredSession(req, res);
    }

    if (!mobileMatches && !emailMatches && !panMatches && !isActiveDraftApplication(application)) {
      return rejectRecoveredSession(req, res);
    }

    req.applicationSession = {
      applicationId: application.application_id || requestedApplicationId,
      mobile: applicationMobile,
      recovered: true,
      viaDraftApplication: !mobileMatches && !emailMatches && !panMatches,
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
