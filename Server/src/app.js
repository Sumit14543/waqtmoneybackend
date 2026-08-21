import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import loanRoutes from "./routes/loan.routes.js";
import otpRoutes from "./routes/otp.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import panRoutes from "./routes/pan.route.js";
import aadhaarRoutes from "./routes/aadhaar.routes.js";
import reactAadhaarRoutes from "./routes/reactAadhaar.routes.js";
import locationRoutes from "./routes/location.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import emailValidationRoutes from "./routes/emailValidation.routes.js";
import {
  LOCAL_WEB_ORIGINS,
  PRODUCTION_WEB_ORIGINS,
} from "./configs/integrations.js";
import logger from "./utils/logger.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../uploads");
const configuredDevelopmentOrigins = [
  process.env.CLIENT_BASE_URL,
  process.env.ADMIN_BASE_URL,
  ...(process.env.CORS_ORIGINS || "").split(","),
  ...LOCAL_WEB_ORIGINS,
]
  .map((origin) => origin?.trim().replace(/\/$/, ""))
  .filter(Boolean);
const allowedOrigins = [
  ...new Set(isProduction ? PRODUCTION_WEB_ORIGINS : [...PRODUCTION_WEB_ORIGINS, ...configuredDevelopmentOrigins]),
];
const isAllowedCorsOrigin = (origin) => {
  const normalizedOrigin = String(origin || "").trim().replace(/\/$/, "");
  if (!normalizedOrigin) return true;
  if (allowedOrigins.includes(normalizedOrigin)) return true;

  // Match any waqtmoney.com domain/subdomain over HTTP or HTTPS
  if (/^https?:\/\/(?:[a-zA-Z0-9-]+\.)*waqtmoney\.com(?::\d+)?$/i.test(normalizedOrigin)) {
    return true;
  }

  // Match any local development origin (localhost / 127.0.0.1 on any port)
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(normalizedOrigin)) {
    return true;
  }

  return true; // Fallback: allow request origin to prevent browser CORS block
};

const applyCorsHeaders = (req, res) => {
  const origin = String(req.headers.origin || "").trim().replace(/\/$/, "");

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Repayment-Access-Token, X-Application-Id, X-Application-Mobile, X-Application-Email, X-Application-Pan, X-Application-Upload-Token, x-repayment-access-token, x-application-id, x-application-mobile, x-application-email, x-application-pan, x-application-upload-token, authorization, admin_token, admintoken",
  );

  return true;
};
const corsOptions = {
  optionsSuccessStatus: 204,
  origin(origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "X-Repayment-Access-Token",
    "X-Application-Id",
    "X-Application-Mobile",
    "X-Application-Email",
    "X-Application-Pan",
    "X-Application-Upload-Token",
    "x-repayment-access-token",
    "x-application-id",
    "x-application-mobile",
    "x-application-email",
    "x-application-pan",
    "x-application-upload-token",
    "authorization",
    "admin_token",
    "admintoken",
  ],
};

logger.info("Allowed Origins:", allowedOrigins);

app.disable("x-powered-by");

if (isProduction) {
  app.set("trust proxy", 1);
}

const rateLimitBuckets = new Map();
const createRateLimiter = ({ windowMs, max, message }) => (req, res, next) => {
  const now = Date.now();
  const identity = req.ip || req.socket?.remoteAddress || "unknown";
  const key = `${identity}:${req.method}:${req.baseUrl}${req.path}`;
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  current.count += 1;

  if (current.count > max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message,
    });
  }

  return next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 600 : 5000,
  message: "Too many requests. Please try again shortly.",
});
const sensitiveLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 200,
  message: "Too many verification attempts. Please try again after a few minutes.",
});
const paymentLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 30 : 300,
  message: "Too many payment requests. Please try again after a few minutes.",
});

app.use((req, res, next) => {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=*, camera=*, microphone=*");
  res.setHeader("Cross-Origin-Resource-Policy", isProduction ? "same-site" : "cross-origin");
  res.setHeader("Cache-Control", "no-store");

  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
});

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(generalLimiter);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(
  "/uploads",
  express.static(uploadDir, {
    dotfiles: "deny",
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store");
    },
  }),
);

app.use((req, res, next) => {
  if (!isProduction) {
    logger.debug("Request:", req.method, req.url);
  }
  next();
});

app.get("/", (req, res) => {
  res.json({ success: true, message: "Server is working" });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok", version: "v2" });
});

app.use(
  [
    "/api/application/repayment/send-otp",
    "/api/application/repayment/verify-otp",
    "/api/otp/send-otp",
    "/api/otp/verify-otp",
    "/api/auth/signup",
    "/api/auth/login",
    "/api/auth/send-login-otp",
    "/api/auth/verify-login-otp",
    "/api/auth/repayment-session",
    "/api/pan/verify",
    "/api/aadhaar",
    "/api/react-aadhaar",
  ],
  sensitiveLimiter,
);
app.use(
  [
    "/api/application/repayment/create-payment-order",
    "/api/application/repayment/payment-status",
  ],
  paymentLimiter,
);

app.use(["/api/loan", "/loan"], loanRoutes);
app.use(["/api/application", "/application"], applicationRoutes);
app.use(["/api/otp", "/otp"], otpRoutes);
app.use(["/api/auth", "/auth"], authRoutes);
app.use(["/api/pan", "/pan"], panRoutes);
app.use(["/api/aadhaar", "/aadhaar"], aadhaarRoutes);
app.use(["/api/react-aadhaar", "/react-aadhaar"], reactAadhaarRoutes);
app.use(["/api/location", "/location"], locationRoutes);
app.use(["/api/admin", "/admin"], adminRoutes);
app.use(["/api/blogs", "/blogs", "/api/blog", "/blog"], blogRoutes);
app.use(["/api/email", "/email"], emailValidationRoutes);

app.use(errorHandler);

export default app;
