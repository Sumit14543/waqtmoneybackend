import dns from "dns";

const MX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const DNS_TIMEOUT_MS = 5000; // 5 seconds
const mxCache = new Map();

// Known free/personal email provider domains
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.in",
  "yahoo.co.uk",
  "yahoo.com.au",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.es",
  "yahoo.it",
  "yahoo.ca",
  "ymail.com",
  "rocketmail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "hotmail.es",
  "hotmail.it",
  "outlook.com",
  "outlook.in",
  "live.com",
  "live.in",
  "live.co.uk",
  "msn.com",
  "passport.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "aol.com",
  "aim.com",
  "zoho.com",
  "zohomail.com",
  "mail.com",
  "email.com",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "gmx.at",
  "yandex.com",
  "yandex.ru",
  "ya.ru",
  "rediffmail.com",
  "rediff.com",
  "inbox.com",
  "fastmail.com",
  "fastmail.fm",
  "hushmail.com",
  "mail.ru",
  "inbox.ru",
  "list.ru",
  "bk.ru",
  "cox.net",
  "sbcglobal.net",
  "att.net",
  "verizon.net",
  "comcast.net",
  "charter.net",
  "earthlink.net",
  "optonline.net",
  "windstream.net",
  "shaw.ca",
  "rogers.com",
  "telus.net",
  "lycos.com",
  "tutanota.com",
  "tutamail.com",
  "tuta.io",
  "disroot.org",
]);

// Known disposable/temporary email provider domains
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "10minut.com.pl",
  "20minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.net",
  "tempail.com",
  "mailinator.com",
  "mailinator2.com",
  "mailinator.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "guerrillamail.biz",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "trashmail.me",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.poke.10001.net",
  "getnada.com",
  "dispostable.com",
  "mohmal.com",
  "dropmail.me",
  "maildrop.cc",
  "crazymailing.com",
  "fakeinbox.com",
  "disposablemail.com",
  "disposablemail.net",
  "disposable.com",
  "disposable.email",
  "burnermail.io",
  "getairmail.com",
  "mytemp.email",
  "tempinbox.com",
  "binkmail.com",
  "bobmail.info",
  "chacuo.net",
  "devnullmail.com",
  "spamgourmet.com",
  "mailcatch.com",
  "mailnesia.com",
  "tmpmail.org",
  "tmpmail.net",
  "emailondeck.com",
  "generator.email",
  "pokemail.net",
  "inboxalias.com",
  "0815.ru",
  "anonbox.net",
  "dayrep.com",
  "rhyta.com",
  "teleworm.us",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "superrito.com",
  "armyspy.com",
  "cuvox.de",
  "is.herewith.me",
  "fake-email.pp.ua",
  "tempmailaddress.com",
  "mytempmail.com",
  "tempmail.de",
  "disposable.cc",
]);

/**
  Check domain MX records using Node.js dns module with timeout & caching.
 */
export const checkDomainMxRecords = async (domain) => {
  const normalizedDomain = String(domain || "").trim().toLowerCase();
  if (!normalizedDomain) return false;

  // Check cache
  const cached = mxCache.get(normalizedDomain);
  if (cached && Date.now() - cached.timestamp < MX_CACHE_TTL_MS) {
    return cached.mx_valid;
  }

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("DNS query timeout")), DNS_TIMEOUT_MS);
    });

    const resolvePromise = dns.promises.resolveMx(normalizedDomain);
    const mxRecords = await Promise.race([resolvePromise, timeoutPromise]);

    const hasValidMx = Array.isArray(mxRecords) && mxRecords.some((rec) => rec && rec.exchange);

    mxCache.set(normalizedDomain, {
      mx_valid: hasValidMx,
      timestamp: Date.now(),
    });

    return hasValidMx;
  } catch (error) {
    // If MX lookup fails or times out, cache negative result temporarily (5 minutes)
    mxCache.set(normalizedDomain, {
      mx_valid: false,
      timestamp: Date.now() - (MX_CACHE_TTL_MS - 5 * 60 * 1000),
    });
    return false;
  }
};

/**
  Validate an official/work email address.
 */
export const validateOfficialEmail = async (email) => {
  const rawEmail = String(email || "").trim();
  const normalizedEmail = rawEmail.toLowerCase();

  // 1. Email format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
  if (!rawEmail || !emailRegex.test(rawEmail)) {
    return {
      valid: false,
      email: rawEmail,
      domain: "",
      type: "invalid",
      mx_valid: false,
      is_personal: false,
      is_disposable: false,
      reason: "Please enter a valid official/company email address.",
    };
  }

  const domain = normalizedEmail.split("@")[1];

  // 2. Personal/free email check
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      email: rawEmail,
      domain,
      type: "personal",
      mx_valid: true,
      is_personal: true,
      is_disposable: false,
      reason: "Personal email providers are not allowed in the Official Email field.",
    };
  }

  // 3. Disposable email check
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      email: rawEmail,
      domain,
      type: "disposable",
      mx_valid: true,
      is_personal: false,
      is_disposable: true,
      reason: "Disposable/temporary emails are not allowed.",
    };
  }

  // 4. MX record validation
  const mxValid = await checkDomainMxRecords(domain);
  if (!mxValid) {
    return {
      valid: false,
      email: rawEmail,
      domain,
      type: "invalid",
      mx_valid: false,
      is_personal: false,
      is_disposable: false,
      reason: "Domain has no valid MX records to receive emails.",
    };
  }

  // 5. Business email classification
  return {
    valid: true,
    email: rawEmail,
    domain,
    type: "business",
    mx_valid: true,
    is_personal: false,
    is_disposable: false,
  };
};
