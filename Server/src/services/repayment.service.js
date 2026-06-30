import logger from "../utils/logger.js";
import {
  CRM_REPAYMENTS_API_URL,
  CRM_STATUS_API_URL,
} from "../configs/integrations.js";

const SOURCE_SYSTEM = process.env.CRM_SOURCE_SYSTEM || "waqtmoney";

const getIntegrationApiKey = () =>
  (
    process.env.INTEGRATION_API_KEYS ||
    process.env.INTEGRATION_API_KEY ||
    process.env.CRM_REPAYMENT_API_KEY ||
    process.env.CRM_INTEGRATION_API_KEY ||
    process.env.CRM_API_KEY ||
    ""
  ).trim();

const buildCrmHeaders = () => {
  const apiKey = getIntegrationApiKey();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (apiKey) {
    headers["x-integration-api-key"] = apiKey;
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
};

const readJsonOrText = async (response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const unwrapCrmData = (payload) => payload?.data || payload;
const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const normalizePan = (value) => String(value || "").trim().toUpperCase();

const maskLookupIdentifier = (value) => {
  const text = String(value || "").trim();
  const mobile = normalizeMobile(text);
  const pan = normalizePan(text);

  if (/^[6-9]\d{9}$/.test(mobile)) return `mobile:XXXXXX${mobile.slice(-4)}`;
  if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return `pan:${pan.slice(0, 2)}*****${pan.slice(-1)}`;
  if (text.length > 8) return `${text.slice(0, 4)}...${text.slice(-4)}`;
  return text ? "redacted" : "";
};

const normalizeCrmDate = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^\d+$/.test(text)) {
    const num = Number(text);
    if (num > 1000000000 && num < 9999999999) {
      return new Date(num * 1000).toISOString();
    }
    return new Date(num).toISOString();
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  if (date.getFullYear() < 2020) {
    date.setFullYear(new Date().getFullYear());
  }

  return date.toISOString();
};

const toFiniteNumber = (value) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[%,\s]/g, "");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : 0;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const firstNumber = (...values) => {
  for (const value of values) {
    const number = toFiniteNumber(value);
    if (number > 0) return number;
  }

  return 0;
};

const firstText = (...values) =>
  values.map((value) => String(value || "").trim()).find(Boolean) || "";

const getCrmRepaymentBlock = (crmStatus = {}) => ({
  ...(crmStatus.repayment || {}),
  ...crmStatus,
});
const normalizeRepaymentBlock = (repayment = {}) => {
  const totalAmount = firstNumber(
    repayment.totalAmount,
    repayment.total_amount,
    repayment.dueAmount,
    repayment.due_amount,
    repayment.totalDue,
    repayment.total_due,
    repayment.maturityAmount,
    repayment.maturity_amount,
    repayment.repaymentAmount,
    repayment.repayment_amount
  );
  const paidAmount = toFiniteNumber(
    repayment.paidAmount !== undefined && repayment.paidAmount !== null
      ? repayment.paidAmount
      : repayment.amountPaid ??
          repayment.amount_paid ??
          repayment.paid_amount ??
          repayment.repaymentPaidAmount ??
          repayment.repayment_paid_amount
  );
  const balanceAmount = firstNumber(
    repayment.balanceAmount,
    repayment.balance_amount,
    repayment.outstanding,
    repayment.outstandingAmount,
    repayment.outstanding_amount,
    repayment.nextPaymentAmount,
    repayment.next_payment_amount,
    Math.max(0, totalAmount - paidAmount)
  );

  return {
    ...repayment,
    status: String(repayment.status || repayment.repaymentStatus || repayment.scheduleStatus || "").toLowerCase(),
    totalAmount,
    paidAmount,
    balanceAmount,
    dueDate: normalizeCrmDate(
      firstText(
        repayment.loanDueDate,
        repayment.loan_due_date,
        repayment.dueDate,
        repayment.due_date,
        repayment.repaymentDueDate,
        repayment.repayment_due_date
      )
    ),
    lastPaymentAt: firstText(
      repayment.lastPaymentAt,
      repayment.last_payment_at,
      repayment.paidAt,
      repayment.paid_at,
      repayment.receivedAt,
      repayment.received_at
    ),
    loanId: firstText(repayment.loanId, repayment.loan_id),
    tenureDays: firstNumber(repayment.tenureDays, repayment.tenure_days, repayment.tenure, repayment.durationDays),
    interestRate: firstNumber(repayment.interestRate, repayment.interest_rate, repayment.dailyInterestRate, repayment.daily_interest_rate),
    interestAccrued: firstNumber(
      repayment.interestAccrued,
      repayment.interest_accrued,
      repayment.interestAmount,
      repayment.interest_amount,
      repayment.interestDue,
      repayment.interest_due
    ),
    principalDue: firstNumber(repayment.principalDue, repayment.principal_due),
    feesDue: firstNumber(repayment.feesDue, repayment.fees_due),
    penaltyDue: firstNumber(repayment.penaltyDue, repayment.penalty_due),
  };
};

const fetchCrmLeadStatus = async (params) => {
  const apiKey = getIntegrationApiKey();
  if (!apiKey) {
    const error = new Error("CRM integration API key is not configured");
    error.statusCode = 500;
    throw error;
  }

  const url = new URL(CRM_STATUS_API_URL);
  url.searchParams.set("sourceSystem", SOURCE_SYSTEM);

  Object.entries(params).forEach(([key, value]) => {
    if (String(value || "").trim()) {
      url.searchParams.set(key, String(value).trim());
    }
  });

  const response = await fetch(url, { headers: buildCrmHeaders() });
  const payload = await readJsonOrText(response);

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload.message || "Unable to fetch CRM lead status");
    error.statusCode = response.status;
    error.data = payload;
    throw error;
  }

  return unwrapCrmData(payload);
};

const fetchCrmLeadStatusById = (identifier) =>
  fetchCrmLeadStatus({
    sourceLeadId: identifier,
    sourceApplicationId: identifier,
  });

const fetchCrmLeadStatusByMobile = (mobile) =>
  fetchCrmLeadStatus({ mobile: normalizeMobile(mobile) });

export const fetchCrmLeadStatusByPan = (pan) =>
  fetchCrmLeadStatus({
    pan: normalizePan(pan),
    panNumber: normalizePan(pan),
  });

const getRepaymentStatus = (repayment = {}) => String(repayment.status || "").toLowerCase();

const hasRepaymentData = (crmStatus = {}) => {
  const repayment = normalizeRepaymentBlock(getCrmRepaymentBlock(crmStatus));
  return Boolean(
    repayment.status ||
      repayment.totalAmount ||
      repayment.paidAmount ||
      repayment.balanceAmount ||
      repayment.dueDate
  );
};

const hasDisbursedStatus = (crmStatus = {}) => {
  const statusCode = String(crmStatus?.statusCode || crmStatus?.crmStatus || "").toLowerCase();
  const disbursementStatus = String(crmStatus?.disbursement?.status || "").toLowerCase();

  return statusCode === "disbursed" || disbursementStatus === "completed";
};

export const buildRepaymentApplicationFromCRM = (identifier, _summary, crmStatus = null) => {
  if (!crmStatus || (!hasRepaymentData(crmStatus) && !hasDisbursedStatus(crmStatus))) {
    return null;
  }

  // CRM repayment update events expose these fields at the top level, while
  // older status responses use a nested repayment block.
  const repayment = normalizeRepaymentBlock(getCrmRepaymentBlock(crmStatus));
  const applicationId = crmStatus.sourceLeadId || crmStatus.sourceApplicationId || crmStatus.applicationId || identifier;
  const loanId = repayment.loanId || crmStatus.loanId || crmStatus.sanction?.loanId || crmStatus.sanction?.agreementNumber || applicationId;
  const totalAmount = repayment.totalAmount;
  const paidAmount = repayment.paidAmount;
  const balanceAmount = repayment.balanceAmount;
  const requestedLoanAmount = firstNumber(crmStatus.loanAmount);
  const approvedLoanAmount = firstNumber(
    crmStatus.sanction?.principalAmount,
    crmStatus.sanction?.principal_amount,
    crmStatus.sanction?.approvedLoanAmount,
    crmStatus.sanction?.approved_loan_amount,
    crmStatus.sanction?.approvedAmount,
    crmStatus.sanction?.approved_amount,
    crmStatus.sanction?.sanctionedAmount,
    crmStatus.sanction?.sanctioned_amount,
    crmStatus.approvedLoanAmount,
    crmStatus.approved_loan_amount,
    crmStatus.approvedAmount,
    crmStatus.approved_amount,
    crmStatus.sanctionedAmount,
    crmStatus.loanAmount,
    repayment.principalDue
  );
  const finalTenureDays =
    repayment.tenureDays ||
    firstNumber(crmStatus.sanction?.tenureDays, crmStatus.sanction?.tenure_days, crmStatus.tenureDays, crmStatus.tenure_days);

  const finalInterestAccrued =
    repayment.interestAccrued ||
    firstNumber(crmStatus.sanction?.interestAccrued, crmStatus.sanction?.interest_accrued, crmStatus.interestAccrued, crmStatus.interest_accrued);

  const finalInterestRate =
    repayment.interestRate ||
    firstNumber(crmStatus.sanction?.interestRate, crmStatus.sanction?.interest_rate, crmStatus.interestRate, crmStatus.interest_rate);

  const displayInterestRate = finalInterestRate ? (String(finalInterestRate).includes("%") ? String(finalInterestRate) : `${finalInterestRate}%`) : "";
  const repaymentStatus = repayment.status;

  return {
    application_id: applicationId,
    loan_id: loanId,
    full_name: crmStatus.customerName || "Customer",
    mobile: normalizeMobile(crmStatus.phone),
    pan_number: crmStatus.pan || crmStatus.panNumber || "",
    requested_loan_amount: requestedLoanAmount || undefined,
    loan_amount: approvedLoanAmount || undefined,
    principal_amount: approvedLoanAmount || undefined,
    disbursed_amount: firstNumber(crmStatus.disbursement?.disbursedAmount, crmStatus.sanction?.disbursedAmount) || undefined,
    maturity_amount: totalAmount || undefined,
    total_repayable_amount: totalAmount || undefined,
    outstanding_amount: balanceAmount,
    next_payment_amount: balanceAmount,
    repayment_paid_amount: paidAmount,
    paid_amount: paidAmount,
    due_date: repayment.dueDate || "",
    repayment_due_date: repayment.dueDate || "",
    tenure_days: finalTenureDays || undefined,
    interest_rate: displayInterestRate,
    interest_accrued: finalInterestAccrued || undefined,
    repayment_status: repaymentStatus,
    payment_status: repaymentStatus,
    status: ["paid", "closed"].includes(repaymentStatus) ? "paid" : repaymentStatus,
    last_payment_at: repayment.lastPaymentAt || "",
    crm_repayment: repayment,
    crm_disbursement: crmStatus.disbursement || null,
    crm_sanction: crmStatus.sanction || null,
    crm_status: crmStatus,
    repayment_source: "crm",
  };
};

export const fetchCrmRepaymentDetails = async (identifier) => {
  const normalizedMobile = normalizeMobile(identifier);
  const normalizedPan = normalizePan(identifier);
  const isMobileLookup = /^[6-9]\d{9}$/.test(normalizedMobile);
  const isPanLookup = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan);

  const crmStatus = await (
    isMobileLookup
      ? fetchCrmLeadStatusByMobile(normalizedMobile)
      : isPanLookup
        ? fetchCrmLeadStatusByPan(normalizedPan)
        : fetchCrmLeadStatusById(identifier)
  ).catch((error) => {
    logger.warn("CRM repayment status fetch failed:", {
      identifier: maskLookupIdentifier(identifier),
      message: error.message,
      statusCode: error.statusCode,
    });
    return null;
  });

  return buildRepaymentApplicationFromCRM(identifier, null, crmStatus);
};

export const summarizeCrmRepayments = () => ({
  repayments: [],
  paidAmount: 0,
  latestRepayment: null,
  repaymentStatus: "",
});

export const fetchCrmRepayments = async ({ sourceLeadId, loanId, mobile } = {}) => {
  const details = await fetchCrmRepaymentDetails(mobile || sourceLeadId || loanId);
  const repayment = details?.crm_repayment || null;

  return {
    repayments: repayment ? [repayment] : [],
    paidAmount: Number(details?.paid_amount || 0),
    latestRepayment: repayment,
    repaymentStatus: details?.repayment_status || "",
  };
};

export const syncRepaymentToCRM = async (repayment) => {
  const payload = {
    sourceSystem: SOURCE_SYSTEM,
    source_system: SOURCE_SYSTEM,
    sourceLeadId: repayment.sourceLeadId,
    source_lead_id: repayment.sourceLeadId,
    leadId: repayment.sourceLeadId,
    lead_id: repayment.sourceLeadId,
    loanId: repayment.loanId,
    loan_id: repayment.loanId,
    amount: Number(repayment.amount || 0),
    method: repayment.method || "ONLINE",
    payment_method: repayment.method || "ONLINE",
    reference: repayment.reference,
    payment_reference: repayment.reference,
    gateway: repayment.gateway || "cashfree",
    payment_gateway: repayment.gateway || "cashfree",
    paidAt: repayment.paidAt || new Date().toISOString(),
    paid_at: repayment.paidAt || new Date().toISOString(),
    status: repayment.status || "success",
  };

  const response = await fetch(CRM_REPAYMENTS_API_URL, {
    method: "POST",
    headers: buildCrmHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await readJsonOrText(response);

  if (!response.ok || data?.success === false) {
    const error = new Error(data.message || "Unable to sync repayment details");
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
