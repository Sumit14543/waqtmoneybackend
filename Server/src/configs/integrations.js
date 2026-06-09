const trimTrailingSlash = (value) => String(value || "").trim().replace(/\/$/, "");
const listFromEnv = (value, fallback = []) => {
  const configured = String(value || "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return configured.length ? configured : fallback;
};

export const PRODUCTION_WEB_ORIGINS = listFromEnv(process.env.PRODUCTION_WEB_ORIGINS, [
  "https://waqtmoney.com",
  "https://www.waqtmoney.com",
  "https://waqt-testing.waqtmoney.com",
]);
export const LOCAL_WEB_ORIGINS = listFromEnv(process.env.LOCAL_WEB_ORIGINS, [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);
export const LOCAL_API_PUBLIC_BASE_URL =
  process.env.LOCAL_API_PUBLIC_BASE_URL || "http://localhost:5000/api";

export const CRM_API_BASE_URL = trimTrailingSlash(
  process.env.CRM_API_BASE_URL || "https://payday-api.waqtmoney.com",
);
export const CRM_LEADS_API_URL =
  process.env.CRM_LEADS_API_URL || `${CRM_API_BASE_URL}/api/integrations/leads`;
export const CRM_STATUS_API_URL =
  process.env.CRM_STATUS_API_URL || `${CRM_API_BASE_URL}/api/integrations/leads/status`;
export const CRM_REPAYMENTS_API_URL =
  process.env.CRM_REPAYMENTS_API_URL || `${CRM_API_BASE_URL}/api/integrations/repayments`;
export const CRM_SANCTION_PDF_API_URL =
  process.env.CRM_SANCTION_PDF_API_URL || `${CRM_API_BASE_URL}/api/integrations/leads/sanction-pdf`;

export const BIFROST_BASE_URL = trimTrailingSlash(
  process.env.BIFROST_BASE_URL || "https://bifrost.unifers.ai/enrich",
);
export const DEEPVUE_MOBILE_TO_UAN_API_URL =
  process.env.DEEPVUE_MOBILE_TO_UAN_API_URL ||
  "https://production.deepvue.tech/v1/mobile-intelligence/mobile-to-uan-list";
export const PAN_DETAILS_API_URL =
  process.env.PAN_DETAILS_API_URL || `${BIFROST_BASE_URL}/get-pan-details`;

export const INDIA_POST_PINCODE_API_URL =
  process.env.INDIA_POST_PINCODE_API_URL || "https://api.postalpincode.in/pincode";
export const PINCODES_INFO_API_URL =
  process.env.PINCODES_INFO_API_URL || "https://pincodesinfo.in/api/pincode";
export const IFSC_API_URL =
  process.env.IFSC_API_URL || "https://ifsc.razorpay.com";

export const CASHFREE_PRODUCTION_BASE_URL =
  process.env.CASHFREE_PRODUCTION_BASE_URL || "https://api.cashfree.com/pg";
export const CASHFREE_SANDBOX_BASE_URL =
  process.env.CASHFREE_SANDBOX_BASE_URL || "https://sandbox.cashfree.com/pg";
