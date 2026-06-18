const isProduction = process.env.NODE_ENV === "production" || process.env.APP_ENV === "production";

const SENSITIVE_KEYS = [
  /aadhaar/i,
  /account/i,
  /authorization/i,
  /cookie/i,
  /email/i,
  /mobile/i,
  /otp/i,
  /pan/i,
  /password/i,
  /phone/i,
  /secret/i,
  /token/i,
];

const maskValue = (value) => {
  const text = String(value);
  if (text.length <= 4) return "***";
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
};

const sanitize = (value, key = "") => {
  if (value instanceof Error) {
    return isProduction ? value.message : value;
  }

  if (SENSITIVE_KEYS.some((pattern) => pattern.test(key))) {
    return value ? maskValue(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey)]),
    );
  }

  return value;
};

const sanitizeArgs = (args) => args.map((arg) => sanitize(arg));

const logger = {
  debug(...args) {
    if (!isProduction) {
      console.log(...sanitizeArgs(args));
    }
  },
  info(...args) {
    console.log(...sanitizeArgs(args));
  },
  warn(...args) {
    console.warn(...sanitizeArgs(args));
  },
  error(...args) {
    console.error(...sanitizeArgs(args));
  },
};

export default logger;
