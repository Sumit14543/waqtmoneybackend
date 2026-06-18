const isProduction = process.env.NODE_ENV === "production";

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret && isProduction) {
    throw new Error("JWT_SECRET is required in production");
  }

  return secret || "development-only-jwt-secret";
};

export const getAppSecret = () => {
  const secret = (process.env.APP_SECRET_KEY || process.env.JWT_SECRET || "").trim();

  if (!secret && isProduction) {
    throw new Error("APP_SECRET_KEY or JWT_SECRET is required in production");
  }

  return secret || "development-only-app-secret";
};
