import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { IFSC_API_URL } from "../configs/integrations.js";

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cacheDir = path.resolve(__dirname, "../../cache/ifsc");

const serviceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const readCache = async (cacheFile, allowExpired = false) => {
  try {
    const stats = await fs.stat(cacheFile);

    if (!allowExpired && Date.now() - stats.mtimeMs >= CACHE_TTL_MS) {
      return null;
    }

    const cached = await fs.readFile(cacheFile, "utf8");
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const writeCache = async (cacheFile, payload) => {
  try {
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cacheFile, JSON.stringify(payload), "utf8");
  } catch {
    // Cache failures should not block IFSC lookup.
  }
};

export const lookupIfsc = async (value) => {
  const ifsc = String(value || "").trim().toUpperCase();

  if (!IFSC_REGEX.test(ifsc)) {
    throw serviceError("Invalid IFSC code");
  }

  const cacheFile = path.join(cacheDir, `${ifsc}.json`);
  const cached = await readCache(cacheFile);

  if (cached) {
    return cached;
  }

  let response;

  try {
    response = await fetch(`${IFSC_API_URL}/${ifsc}`, {
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    const staleCache = await readCache(cacheFile, true);

    if (staleCache) {
      return staleCache;
    }

    throw serviceError("IFSC API connection failed", 502);
  }

  if (!response.ok) {
    throw serviceError("IFSC not found", 404);
  }

  const data = await response.json().catch(() => null);

  if (!data || !data.BANK) {
    throw serviceError("Invalid IFSC response", 502);
  }

  const payload = {
    ifsc,
    bank: data.BANK || "",
    branch: data.BRANCH || "",
    city: data.CITY || "",
    state: data.STATE || "",
    address: data.ADDRESS || "",
  };

  await writeCache(cacheFile, payload);
  return payload;
};
