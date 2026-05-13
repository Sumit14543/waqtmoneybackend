import logger from "../utils/logger.js";

/**
 * Syncs lead data to the external Waqt Finance CRM.
 * @param {Object} leadData - The full application data object.
 * @returns {Promise<Object>} - The sync response.
 */
const syncLeadToCRM = async (leadData) => {
  try {
    const crmApiKey = process.env.CRM_API_KEY?.trim();

    if (!crmApiKey && process.env.NODE_ENV === "production") {
      throw new Error("CRM_API_KEY is not configured");
    }

    const response = await fetch(
      "https://waqtfinance.com/api/sync/sync-waqtmoney-lead.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": crmApiKey || "development-only-crm-key"
        },
        body: JSON.stringify(leadData)
      }
    );

    const data = await response.json();
    logger.debug("CRM sync response:", {
      status: response.status,
      ok: response.ok,
      responseStatus: data?.status,
    });
    return data;
  } catch (error) {
    logger.error("CRM sync error:", error.message);
    return {
      status: "error",
      message: error.message
    };
  }
};

export default syncLeadToCRM;
