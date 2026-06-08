import logger from "../utils/logger.js";
import {
  BIFROST_BASE_URL,
  DEEPVUE_MOBILE_TO_UAN_API_URL,
} from "../configs/integrations.js";

const DEFAULT_UAN_ENDPOINT = "get-phone-to-uan";
const POSITIVE_CACHE_TTL_MS = Number(process.env.UAN_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const NEGATIVE_CACHE_TTL_MS = Number(process.env.UAN_NEGATIVE_CACHE_TTL_MS || 10 * 60 * 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.UAN_API_TIMEOUT_MS || 7000);
const PHONE_TO_UAN_CONSENT_TEXT =
  "We confirm and undertake that valid end-user consent has been obtained for fetching PHONE TO UAN using MOBILE NUMBER, and that such consent remains active and unrevoked at the time of this request.";
const uanCache = new Map();
const pendingLookups = new Map();

const getBifrostToken = () => process.env.BIFROST_API_TOKEN || process.env.PAN_API_KEY || "";

const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);

const getBifrostAuthHeader = () => {
  const token = getBifrostToken();
  const prefix = process.env.BIFROST_AUTH_PREFIX ?? "";

  return token ? `${prefix}${token}` : "";
};

const getCachedUan = (mobile) => {
  const cached = uanCache.get(mobile);
  if (!cached || cached.expiresAt < Date.now()) {
    uanCache.delete(mobile);
    return null;
  }

  return cached.uanNumber;
};

const setCachedUan = (mobile, uanNumber) => {
  uanCache.set(mobile, {
    uanNumber: uanNumber || "",
    expiresAt: Date.now() + (uanNumber ? POSITIVE_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
  });
};

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const buildUrlWithMobile = (url, mobile) => {
  const parsedUrl = new URL(url);
  if (!parsedUrl.searchParams.has("mobile_number")) {
    parsedUrl.searchParams.set("mobile_number", mobile);
  }
  return parsedUrl.toString();
};

const buildBifrostUanQueryUrl = (endpoint, mobile) => {
  const parsedUrl = new URL(`${BIFROST_BASE_URL}/${endpoint}`);
  parsedUrl.searchParams.set("phone_number", mobile);
  parsedUrl.searchParams.set("mobile_number", mobile);
  parsedUrl.searchParams.set("Mobile_Number", mobile);
  return parsedUrl.toString();
};

const fetchConfiguredUanByMobile = async (mobile) => {
  if (!process.env.UAN_API_URL) return "";

  const method = (process.env.UAN_API_METHOD || "POST").toUpperCase();
  const token = process.env.UAN_API_TOKEN || process.env.DEEPVUE_API_TOKEN || "";
  const authHeader = process.env.UAN_API_AUTH_HEADER || "Authorization";
  const authPrefix = process.env.UAN_API_AUTH_PREFIX ?? "Bearer ";
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers[authHeader] = `${authPrefix}${token}`;
  }

  const requestOptions = {
    method,
    headers,
  };

  let url = process.env.UAN_API_URL;
  if (method === "GET") {
    url = buildUrlWithMobile(url, mobile);
  } else {
    requestOptions.body = JSON.stringify({
      mobile,
      mobile_number: mobile,
      Mobile_Number: mobile,
    });
  }

  try {
    const response = await fetchWithTimeout(url, requestOptions);
    const text = await response.text();
    const data = JSON.parse(text);
    const uanNumber = extractUanNumber(data);

    logger.debug("Configured UAN API response:", {
      status: response.status,
      hasUanNumber: Boolean(uanNumber),
      message: data?.message || data?.msg || null,
    });

    return uanNumber;
  } catch (error) {
    logger.warn("Configured UAN API failed:", error.message);
    return "";
  }
};

const fetchDeepvueUanByMobile = async (mobile) => {
  const token = process.env.DEEPVUE_API_TOKEN;
  if (!token) return "";

  try {
    const url = new URL(DEEPVUE_MOBILE_TO_UAN_API_URL);
    url.searchParams.set("mobile_number", mobile);
    const response = await fetchWithTimeout(
      url.toString(),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const text = await response.text();
    const data = JSON.parse(text);
    const uanNumber = extractUanNumber(data);

    logger.debug("Deepvue UAN lookup response:", {
      status: response.status,
      hasUanNumber: Boolean(uanNumber),
      message: data?.message || data?.sub_code || null,
    });

    return uanNumber;
  } catch (error) {
    logger.warn("Deepvue UAN lookup failed:", error.message);
    return "";
  }
};

const getUanEndpoints = () => {
  const configuredEndpoint = process.env.BIFROST_UAN_ENDPOINT || DEFAULT_UAN_ENDPOINT;
  const endpoints = [configuredEndpoint, DEFAULT_UAN_ENDPOINT];

  if (process.env.UAN_ENABLE_LEGACY_ENDPOINT_FALLBACK === "true") {
    endpoints.push(
      "get-uan-by-mobile",
      "get-uan-details-by-mobile",
      "get-uan-details",
      "get-uan",
      "uan-by-mobile"
    );
  }

  return [...new Set(endpoints.filter(Boolean))];
};

const getUanPayloads = (mobile) => [
  {
    Mobile_Number: mobile,
    Concent: "Y",
    Concent_Text: PHONE_TO_UAN_CONSENT_TEXT,
  },
  {
    phone_number: mobile,
    Concent: "Y",
    Concent_Text: PHONE_TO_UAN_CONSENT_TEXT,
  },
  {
    Phone_Number: mobile,
    Concent: "Y",
    Concent_Text: PHONE_TO_UAN_CONSENT_TEXT,
  },
  {
    mobile_number: mobile,
    Concent: "Y",
    Concent_Text: PHONE_TO_UAN_CONSENT_TEXT,
  },
  {
    phone: mobile,
    Concent: "Y",
    Concent_Text: PHONE_TO_UAN_CONSENT_TEXT,
  },
];

export const extractUanNumber = (...sources) => {
  const normalizeKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
  const pickUanFromValue = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.match(/\d{12}/)?.[0] || "";
  };

  const scan = (source, keyHint = "") => {
    if (source == null) return "";

    if (typeof source !== "object") {
      const directDigits = String(source || "").replace(/\D/g, "");
      if (/^\d{12}$/.test(directDigits)) return directDigits;

      return normalizeKey(keyHint).includes("uan") || String(source).toLowerCase().includes("uan")
        ? pickUanFromValue(source)
        : "";
    }

    if (Array.isArray(source)) {
      for (const item of source) {
        const nested = scan(item, keyHint);
        if (nested) return nested;
      }
      return "";
    }

    for (const [key, value] of Object.entries(source)) {
      const normalizedKey = normalizeKey(key);
      const nextHint = normalizedKey.includes("uan") ? key : keyHint;

      if (normalizedKey.includes("uan")) {
        const direct = pickUanFromValue(value);
        if (direct) return direct;
      }

      const nested = scan(value, nextHint);
      if (nested) return nested;
    }

    return "";
  };

  for (const source of sources) {
    const uan = scan(source);
    if (uan) return uan;
  }

  return "";
};

export const fetchUanByMobile = async (mobile) => {
  const normalizedMobile = normalizeMobile(mobile);
  if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
    logger.warn("UAN lookup skipped: invalid mobile", { hasMobile: Boolean(mobile) });
    return "";
  }

  const cachedUanNumber = getCachedUan(normalizedMobile);
  if (cachedUanNumber !== null) return cachedUanNumber;

  if (pendingLookups.has(normalizedMobile)) {
    return pendingLookups.get(normalizedMobile);
  }

  const lookupPromise = fetchFreshUanByMobile(normalizedMobile).finally(() => {
    pendingLookups.delete(normalizedMobile);
  });

  pendingLookups.set(normalizedMobile, lookupPromise);
  return lookupPromise;
};

const fetchFreshUanByMobile = async (normalizedMobile) => {
  const configuredUanNumber = await fetchConfiguredUanByMobile(normalizedMobile);
  if (configuredUanNumber) {
    setCachedUan(normalizedMobile, configuredUanNumber);
    return configuredUanNumber;
  }

  const token = getBifrostAuthHeader();
  if (!token) {
    logger.warn("UAN lookup skipped: BIFROST_API_TOKEN is not configured");
    setCachedUan(normalizedMobile, "");
    return "";
  }

  const endpoints = getUanEndpoints();
  const payloads = getUanPayloads(normalizedMobile);

  for (const endpoint of endpoints) {
    for (const payload of payloads) {
      let response;

      try {
        response = await fetchWithTimeout(`${BIFROST_BASE_URL}/${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        logger.warn("UAN lookup request failed:", {
          endpoint,
          message: error.name === "AbortError" ? "Request timed out" : error.message,
        });
        continue;
      }

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        logger.warn("UAN lookup returned invalid JSON", {
          endpoint,
          status: response.status,
          preview: text.slice(0, 160),
        });
        continue;
      }

      const uanNumber = extractUanNumber(data);
      logger.debug("UAN lookup response:", {
        endpoint,
        status: response.status,
        apiError: data?.error === true,
        hasUanNumber: Boolean(uanNumber),
        message: data?.message || data?.msg || null,
      });

      if (uanNumber) {
        setCachedUan(normalizedMobile, uanNumber);
        return uanNumber;
      }
    }

    try {
      const response = await fetchWithTimeout(buildBifrostUanQueryUrl(endpoint, normalizedMobile), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });
      const text = await response.text();
      const data = JSON.parse(text);
      const uanNumber = extractUanNumber(data);

      logger.debug("UAN lookup GET response:", {
        endpoint,
        status: response.status,
        apiError: data?.error === true,
        hasUanNumber: Boolean(uanNumber),
        message: data?.message || data?.msg || null,
      });

      if (uanNumber) {
        setCachedUan(normalizedMobile, uanNumber);
        return uanNumber;
      }
    } catch (error) {
      logger.warn("UAN lookup GET failed:", {
        endpoint,
        message: error.name === "AbortError" ? "Request timed out" : error.message,
      });
    }
  }

  const deepvueUanNumber = await fetchDeepvueUanByMobile(normalizedMobile);
  if (deepvueUanNumber) {
    setCachedUan(normalizedMobile, deepvueUanNumber);
    return deepvueUanNumber;
  }

  logger.warn("UAN lookup completed without UAN number");
  setCachedUan(normalizedMobile, "");
  return "";
};

export const clearUanLookupCache = () => {
  uanCache.clear();
  pendingLookups.clear();
};
  
