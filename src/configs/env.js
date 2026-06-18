import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../..");
const baseEnvPath = path.resolve(serverRoot, ".env");

dotenv.config({ path: baseEnvPath, quiet: true });

const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || "local").trim().toLowerCase();
const envName = appEnv === "production" ? "production" : "local";
const envPath = path.resolve(serverRoot, `.env.${envName}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true, quiet: true });
}

const isHttpsUrl = (value) => /^https:\/\/[^/]+/i.test(String(value || ""));

if (process.env.NODE_ENV === "production") {
  const requiredEnvVars = [
    "CLIENT_BASE_URL",
    "API_PUBLIC_BASE_URL",
    "DB_HOST",
    "DB_NAME",
    "DB_USER",
    "JWT_SECRET",
    "CASHFREE_CLIENT_ID",
    "CASHFREE_CLIENT_SECRET",
  ];
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]?.trim());

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required production env vars: ${missingEnvVars.join(", ")}`);
  }

  if (!process.env.APP_SECRET_KEY?.trim() && !process.env.JWT_SECRET?.trim()) {
    throw new Error("Missing required production env vars: APP_SECRET_KEY or JWT_SECRET");
  }

  const httpsEnvVars = [
    "CLIENT_BASE_URL",
    "CASHFREE_RETURN_URL",
  ].filter((key) => process.env[key]?.trim());
  const insecureEnvVars = httpsEnvVars.filter((key) => !isHttpsUrl(process.env[key]));

  if (insecureEnvVars.length > 0) {
    throw new Error(`Production env vars must be HTTPS URLs: ${insecureEnvVars.join(", ")}`);
  }

  const cashfreeSecret = process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY || "";
  if ((process.env.CASHFREE_ENV || "production").toLowerCase() === "production" && cashfreeSecret.includes("_test_")) {
    throw new Error("Production Cashfree mode cannot use test credentials");
  }
}
