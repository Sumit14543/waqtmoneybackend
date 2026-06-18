import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const INTEGRATION_API_KEYS = process.env.INTEGRATION_API_KEYS || "waqt@2026";

const mobileArg = process.argv[2];
if (!mobileArg) {
  console.log("Usage: node test_crm_check.js <10-digit-mobile-number>");
  process.exit(1);
}

const mobile = String(mobileArg).replace(/\D/g, "").slice(-10);

async function checkCrm(baseUrl, name) {
  const url = `${baseUrl}/api/check-active-application`;
  console.log(`\nQuerying CRM (${name}): ${url}`);

  const payload = {
    phone: mobile
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-integration-api-key": INTEGRATION_API_KEYS
      },
      body: JSON.stringify(payload)
    });

    console.log(`Response Status: ${response.status}`);
    const text = await response.text();
    console.log("Response Body:", text);
  } catch (error) {
    console.error("Fetch failed:", error.message);
  }
}

async function runAll() {
  await checkCrm("https://testing-api.waqtmoney.com", "Testing CRM");
  await checkCrm("https://payday-api.waqtmoney.com", "Payday CRM");
}

runAll();
