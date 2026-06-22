const normalizeOrigin = (value) => String(value || "").trim().replace(/\/$/, "");

export const getTrustedHttpsOrigin = (origin, allowedOrigins = []) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return "";

  try {
    if (new URL(normalizedOrigin).protocol !== "https:") return "";
  } catch {
    return "";
  }

  const normalizedAllowedOrigins = new Set(
    allowedOrigins.map(normalizeOrigin).filter(Boolean),
  );

  return normalizedAllowedOrigins.has(normalizedOrigin) ? normalizedOrigin : "";
};