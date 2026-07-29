import crypto from "crypto";

const isProduction = process.env.NODE_ENV === "production";
const runtimeRandomSecret = crypto.randomBytes(32).toString("hex");
const runtimeRandomAppSecret = crypto.randomBytes(32).toString("hex");

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret && isProduction) {
    console.warn("[SECURITY WARNING] JWT_SECRET is not defined in .env! Generated secure runtime secret.");
  }
  return secret || runtimeRandomSecret;
};

export const getAppSecret = () => {
  const secret = (process.env.APP_SECRET_KEY || process.env.JWT_SECRET || "").trim();
  return secret || runtimeRandomAppSecret;
};
