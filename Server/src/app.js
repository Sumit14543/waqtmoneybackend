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
const configuredOrigins = [
  process.env.CLIENT_BASE_URL,
  process.env.ADMIN_BASE_URL,
  ...(process.env.CORS_ORIGINS || "").split(","),
]
  .map((origin) => origin?.trim().replace(/\/$/, ""))
  .filter(Boolean);

const localOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

if (process.env.ALLOW_LOCAL_CORS !== "false") {
  configuredOrigins.push(
    ...localOrigins,
  );
}

const allowedOrigins = [...new Set(configuredOrigins)];

logger.info("Allowed Origins:", allowedOrigins);

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
});

app.use(
  cors({
    optionsSuccessStatus: 204,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }

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
  }),
);
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
