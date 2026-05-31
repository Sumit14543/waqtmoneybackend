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
import logger from "./utils/logger.js";

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../uploads");
const defaultProductionOrigins = [
  "https://waqtmoney.com",
  "https://www.waqtmoney.com",
  "http://waqt-testing.waqtmoney.com",
  "https://waqt-testing.waqtmoney.com",
];
const configuredOrigins = [
  ...defaultProductionOrigins,
  process.env.CLIENT_BASE_URL,
  process.env.ADMIN_BASE_URL,
  ...(process.env.CORS_ORIGINS || "").split(","),
]
  .map((origin) => origin?.trim().replace(/\/$/, ""))
  .filter(Boolean);

const localOrigins = ["http://localhost:8080", "http://127.0.0.1:8080"];

if (process.env.ALLOW_LOCAL_CORS !== "false") {
  configuredOrigins.push(...localOrigins);
}

const allowedOrigins = [...new Set(configuredOrigins)];
const isAllowedCorsOrigin = (origin) => {
  const normalizedOrigin = String(origin || "").trim().replace(/\/$/, "");
  if (!normalizedOrigin) return true;
  if (allowedOrigins.includes(normalizedOrigin)) return true;

  return /^https?:\/\/(?:[a-z0-9-]+\.)?waqtmoney\.com$/i.test(normalizedOrigin);
};

const applyCorsHeaders = (req, res) => {
  const origin = String(req.headers.origin || "").trim().replace(/\/$/, "");
  if (!isAllowedCorsOrigin(origin)) return false;

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Repayment-Access-Token",
  );

  return true;
};
const corsOptions = {
  optionsSuccessStatus: 204,
  origin(origin, callback) {
    if (isAllowedCorsOrigin(origin)) {
      callback(null, true);
      return;
    }

    logger.warn(`CORS blocked origin: ${origin}`);
    const error = new Error(`CORS policy does not allow access from ${origin}`);
    error.statusCode = 403;
    callback(error);
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
  ],
};

logger.info("Allowed Origins:", allowedOrigins);

app.disable("x-powered-by");

app.use((req, res, next) => {
  const corsApplied = applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    if (!corsApplied) {
      logger.warn(`CORS blocked origin: ${req.headers.origin || "unknown"}`);
      return res.sendStatus(403);
    }

    return res.sendStatus(204);
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
});

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static(uploadDir));

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
  res.json({ success: true, status: "ok" });
});

app.use("/api/loan", loanRoutes);
app.use("/api/application", applicationRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/pan", panRoutes);
app.use("/api/aadhaar", aadhaarRoutes);
app.use("/api/react-aadhaar", reactAadhaarRoutes);

app.use(errorHandler);

export default app;
