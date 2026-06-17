import crypto from "crypto";
import { getAppSecret } from "../configs/secrets.js";
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
