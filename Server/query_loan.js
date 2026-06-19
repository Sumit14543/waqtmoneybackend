import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const apiKey = "waqt@2026";
const baseUrl = "https://testing-api.waqtmoney.com";

async function queryCrm(params) {
  const url = new URL(`${baseUrl}/api/integrations/leads/status`);
  url.searchParams.set("sourceSystem", "waqtmoney");
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  console.log(`Querying CRM with params: ${JSON.stringify(params)}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-integration-api-key": apiKey,
        "Authorization": `Bearer ${apiKey}`
      }
    });

    console.log(`Response Status: ${response.status}`);
    const data = await response.json();
    if (data.success && data.data) {
      console.log("SUCCESS! Found customer:", data.data.customerName);
      console.log("Customer Phone:", data.data.phone);
      console.log("Raw JSON:", JSON.stringify(data.data, null, 2));
      return true;
    } else {
      console.log("Failed:", data.message || "Not found");
      return false;
    }
  } catch (error) {
    console.error("Fetch failed:", error.message);
    return false;
  }
}

async function run() {
  // Try querying by different identifiers
  const found = await queryCrm({ sourceLeadId: "821" });
  if (!found) {
    await queryCrm({ loanId: "LNWQTMN00821" });
  }
}

run();
