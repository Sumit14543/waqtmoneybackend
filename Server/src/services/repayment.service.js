import logger from "../utils/logger.js";

const CRM_REPAYMENTS_API_URL =
  process.env.CRM_REPAYMENTS_API_URL ||
  "https://payday-api.waqtmoney.com/api/integrations/repayments";
const CRM_STATUS_API_URL =
  process.env.CRM_STATUS_API_URL ||
  "https://payday-api.waqtmoney.com/api/integrations/leads/status";

const getCrmRepaymentToken = () =>
  (
    process.env.CRM_REPAYMENT_BEARER_TOKEN ||
    process.env.CRM_REPAYMENT_API_KEY ||
    process.env.INTEGRATION_API_KEYS ||
    process.env.INTEGRATION_API_KEY ||
    process.env.CRM_INTEGRATION_API_KEY ||
    ""
  ).trim();

const buildCrmRepaymentHeaders = () => {
  const token = getCrmRepaymentToken();
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["x-integration-api-key"] = token;
  }

  if (process.env.CRM_REPAYMENT_USER_EMAIL) {
    headers["X-User-Email"] = process.env.CRM_REPAYMENT_USER_EMAIL;
  }
  if (process.env.CRM_REPAYMENT_USER_NAME) {
    headers["X-User-Name"] = process.env.CRM_REPAYMENT_USER_NAME;
  }
  if (process.env.CRM_REPAYMENT_USER_ROLE) {
    headers["X-User-Role"] = process.env.CRM_REPAYMENT_USER_ROLE;
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

const getIntegrationApiKey = () =>
  (
    process.env.INTEGRATION_API_KEYS ||
    process.env.INTEGRATION_API_KEY ||
    process.env.CRM_INTEGRATION_API_KEY ||
    ""
  ).trim();

const fetchCrmLeadStatusById = async (identifier) => {
  const apiKey = getIntegrationApiKey();
  if (!apiKey || !identifier) return null;

  const url = new URL(CRM_STATUS_API_URL);
  url.searchParams.set("sourceSystem", "waqtmoney");
  url.searchParams.set("sourceLeadId", identifier);
  url.searchParams.set("sourceApplicationId", identifier);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await readJsonOrText(response);

  if (!response.ok || data?.success === false) {
    const error = new Error(data.message || "Unable to fetch CRM loan status");
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data.data || null;
};

const normalizeMobile = (value) => String(value || "").replace(/\D/g, "").slice(-10);
const normalizePan = (value) => String(value || "").trim().toUpperCase();

const fetchCrmLeadStatusByMobile = async (mobile) => {
  const apiKey = getIntegrationApiKey();
  const normalizedMobile = normalizeMobile(mobile);
  if (!apiKey || !/^[6-9]\d{9}$/.test(normalizedMobile)) return null;

  const url = new URL(CRM_STATUS_API_URL);
  url.searchParams.set("sourceSystem", "waqtmoney");
  url.searchParams.set("mobile", normalizedMobile);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await readJsonOrText(response);

  if (!response.ok || data?.success === false) {
    const error = new Error(data.message || "Unable to fetch CRM loan status by mobile");
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data.data || null;
};

const fetchCrmLeadStatusByPan = async (pan) => {
  const apiKey = getIntegrationApiKey();
  const normalizedPan = normalizePan(pan);
  if (!apiKey || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan)) return null;

  const url = new URL(CRM_STATUS_API_URL);
  url.searchParams.set("sourceSystem", "waqtmoney");
  url.searchParams.set("sourceLeadId", normalizedPan);
  url.searchParams.set("sourceApplicationId", normalizedPan);
  url.searchParams.set("pan", normalizedPan);
  url.searchParams.set("panNumber", normalizedPan);
  url.searchParams.set("pan_number", normalizedPan);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await readJsonOrText(response);

  if (!response.ok || data?.success === false) {
    const error = new Error(data.message || "Unable to fetch CRM loan status by PAN");
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data.data || null;
};

const normalizeRepaymentList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (Array.isArray(value.repayments)) return value.repayments.filter(Boolean);
  if (Array.isArray(value.items)) return value.items.filter(Boolean);
  if (Array.isArray(value.data)) return value.data.filter(Boolean);
  return [value];
};

const getRepaymentAmount = (repayment) =>
  Number(
    repayment?.amount ||
      repayment?.paidAmount ||
      repayment?.paid_amount ||
      repayment?.paymentAmount ||
      0
  );

const isSuccessfulRepayment = (repayment) => {
  const status = String(repayment?.status || repayment?.paymentStatus || "").toLowerCase();
  return ["success", "successful", "paid", "completed", "captured"].includes(status);
};

const isDisbursedLoanRecord = (repayment) => {
  const status = String(
    repayment?.loanStatus ||
      repayment?.loan_status ||
      repayment?.disbursementStatus ||
      repayment?.disbursement_status ||
      repayment?.status ||
      ""
  ).toLowerCase();
  const hasDisbursalDate = Boolean(
    repayment?.disbursedAt ||
      repayment?.disbursed_at ||
      repayment?.disbursalDate ||
      repayment?.disbursal_date ||
      repayment?.disbursementDate ||
      repayment?.disbursement_date
  );
  const amount = Number(
    repayment?.loanAmount ||
      repayment?.loan_amount ||
      repayment?.disbursedAmount ||
      repayment?.disbursed_amount ||
      repayment?.principalAmount ||
      repayment?.principal_amount ||
      0
  );

  return (
    ["disbursed", "active", "approved", "overdue", "partial_paid", "paid"].includes(status) ||
    hasDisbursalDate ||
    (Number.isFinite(amount) && amount > 0)
  );
};

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const firstPositiveNumber = (...values) => {
  for (const value of values) {
    const number = toFiniteNumber(value);
    if (number > 0) return number;
  }

  return 0;
};

const getCrmRepaymentInfo = (crmStatus = {}) => crmStatus.repayment || {};

const getCrmRepaymentStatus = (repayment = {}) =>
  String(
    repayment.loanStatus ||
      repayment.loan_status ||
      repayment.status ||
      repayment.repaymentStatus ||
      repayment.repayment_status ||
      repayment.scheduleStatus ||
      repayment.schedule_status ||
      ""
  ).toLowerCase();

const getCrmRepaymentOutstanding = (repayment = {}) => {
  const directOutstanding = firstPositiveNumber(
    repayment.outstanding,
    repayment.outstandingAmount,
    repayment.outstanding_amount,
    repayment.balanceAmount,
    repayment.balance_amount,
    repayment.dueAmount,
    repayment.due_amount,
    repayment.totalDue,
    repayment.total_due
  );

  if (directOutstanding > 0) return directOutstanding;

  const totalDue = toFiniteNumber(repayment.totalDue || repayment.total_due);
  const paidAmount = toFiniteNumber(
    repayment.amountPaid || repayment.amount_paid || repayment.paidAmount || repayment.paid_amount
  );

  return Math.max(0, Number((totalDue - paidAmount).toFixed(2)));
};

const hasActiveCrmRepayment = (crmStatus = {}) => {
  const repayment = getCrmRepaymentInfo(crmStatus);
  const repaymentStatus = getCrmRepaymentStatus(repayment);
  const outstanding = getCrmRepaymentOutstanding(repayment);
  const loanId = repayment.loanId || repayment.loan_id;
  const closedStatuses = ["closed", "paid", "completed", "settled"];

  if (!loanId || !Number.isFinite(outstanding) || outstanding <= 0) return false;
  if (closedStatuses.some((status) => repaymentStatus.includes(status))) return false;

  return (
    ["active", "pending", "partial", "overdue", "due"].some((status) =>
      repaymentStatus.includes(status)
    ) ||
    outstanding > 0
  );
};

const hasDisbursedCrmStatus = (crmStatus = {}) => {
  const status = String(
    crmStatus.disbursement?.status ||
      crmStatus.disbursementStatus ||
      crmStatus.disbursement_status ||
      crmStatus.crmStatus ||
      crmStatus.publicStatus ||
      crmStatus.currentStage ||
      ""
  ).toLowerCase();
  const sanction = crmStatus.sanction || {};
  const disbursedAmount = Number(
    sanction.disbursedAmount ||
      sanction.disbursed_amount ||
      crmStatus.disbursedAmount ||
      crmStatus.disbursed_amount ||
      0
  );
  const hasDisbursalDate = Boolean(
    crmStatus.disbursement?.disbursedAt ||
      crmStatus.disbursement?.disbursalDate ||
      crmStatus.disbursement?.disbursementDate ||
      sanction.disbursedAt ||
      sanction.disbursalDate ||
      sanction.disbursementDate ||
      crmStatus.disbursedAt ||
      crmStatus.disbursalDate ||
      crmStatus.disbursementDate
  );

  return (
    hasActiveCrmRepayment(crmStatus) ||
    status.includes("disbursed") ||
    status.includes("active") ||
    status.includes("overdue") ||
    status.includes("paid") ||
    hasDisbursalDate ||
    (Number.isFinite(disbursedAmount) && disbursedAmount > 0)
  );
};

export const summarizeCrmRepayments = (repayments = []) => {
  const successfulRepayments = repayments.filter(isSuccessfulRepayment);
  const paidAmount = successfulRepayments.reduce((sum, repayment) => {
    const amount = getRepaymentAmount(repayment);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const latestRepayment = successfulRepayments
    .slice()
    .sort((a, b) => {
      const left = new Date(a.paidAt || a.paid_at || a.createdAt || 0).getTime();
      const right = new Date(b.paidAt || b.paid_at || b.createdAt || 0).getTime();
      return right - left;
    })[0];

  return {
    repayments,
    paidAmount,
    latestRepayment: latestRepayment || null,
    repaymentStatus: paidAmount > 0 ? "partial_paid" : "",
  };
};

export const buildRepaymentApplicationFromCRM = (identifier, summary, crmStatus = null) => {
  const repayments = summary?.repayments || [];
  const loanRecord = repayments.find(isDisbursedLoanRecord);
  if (!loanRecord && !hasDisbursedCrmStatus(crmStatus || {})) return null;

  const latestRepayment = summary?.latestRepayment || repayments[0] || {};
  const firstRepayment = loanRecord || {};
  const sanction = crmStatus?.sanction || {};
  const repaymentInfo = crmStatus?.repayment || {};
  const disbursementInfo = crmStatus?.disbursement || {};
  const sourceLeadId =
    crmStatus?.sourceLeadId ||
    crmStatus?.sourceApplicationId ||
    firstRepayment.sourceLeadId ||
    firstRepayment.source_lead_id ||
    latestRepayment.sourceLeadId ||
    latestRepayment.source_lead_id ||
    identifier;
  const loanId =
    crmStatus?.loanId ||
    crmStatus?.loan_id ||
    repaymentInfo.loanId ||
    repaymentInfo.loan_id ||
    disbursementInfo.loanId ||
    disbursementInfo.loan_id ||
    sanction.loanId ||
    sanction.loan_id ||
    sanction.agreementNumber ||
    firstRepayment.loanId ||
    firstRepayment.loan_id ||
    latestRepayment.loanId ||
    latestRepayment.loan_id ||
    sourceLeadId;
  const loanAmount = Number(
    sanction.disbursedAmount ||
      sanction.principalAmount ||
      sanction.approvedLoanAmount ||
      sanction.approvedAmount ||
      sanction.sanctionedAmount ||
      crmStatus?.loanAmount ||
      crmStatus?.approvedLoanAmount ||
      crmStatus?.approvedAmount ||
      crmStatus?.sanctionedAmount ||
      firstRepayment.loanAmount ||
      firstRepayment.loan_amount ||
      firstRepayment.disbursedAmount ||
      firstRepayment.disbursed_amount ||
      firstRepayment.principalAmount ||
      firstRepayment.principal_amount ||
      0
  );
  const outstandingAmount = firstPositiveNumber(
    getCrmRepaymentOutstanding(repaymentInfo),
    disbursementInfo.outstanding,
    disbursementInfo.outstandingAmount,
    firstRepayment.outstandingAmount,
    firstRepayment.outstanding_amount,
    firstRepayment.dueAmount,
    firstRepayment.due_amount,
    firstRepayment.payableAmount,
    firstRepayment.payable_amount
  );
  const maturityAmount = firstPositiveNumber(
    sanction.repaymentAmount ||
      sanction.maturityAmount ||
      repaymentInfo.repaymentAmount ||
      repaymentInfo.totalDue ||
      repaymentInfo.total_due ||
      repaymentInfo.outstanding ||
      repaymentInfo.dueAmount ||
      repaymentInfo.due_amount ||
      firstRepayment.maturityAmount ||
      firstRepayment.maturity_amount ||
      firstRepayment.repaymentAmount ||
      firstRepayment.repayment_amount ||
      0
  );
  const dueDate =
    sanction.dueDate ||
    sanction.repaymentDueDate ||
    repaymentInfo.dueDate ||
    repaymentInfo.due_date ||
    disbursementInfo.dueDate ||
    disbursementInfo.due_date ||
    firstRepayment.dueDate ||
    firstRepayment.due_date ||
    firstRepayment.repaymentDueDate ||
    firstRepayment.repayment_due_date ||
    "";
  const paidAmount = toFiniteNumber(
    summary?.paidAmount ||
      repaymentInfo.amountPaid ||
      repaymentInfo.amount_paid ||
      repaymentInfo.paidAmount ||
      repaymentInfo.paid_amount ||
      0
  );
  const normalizedRepaymentStatus =
    summary?.repaymentStatus ||
    repaymentInfo.repaymentStatus ||
    repaymentInfo.repayment_status ||
    repaymentInfo.loanStatus ||
    repaymentInfo.loan_status ||
    repaymentInfo.status ||
    "";

  return {
    application_id: sourceLeadId,
    loan_id: loanId,
    full_name:
      crmStatus?.customerName ||
      firstRepayment.customerName ||
      firstRepayment.customer_name ||
      firstRepayment.name ||
      "Customer",
    mobile: normalizeMobile(firstRepayment.mobile || firstRepayment.phone || crmStatus?.phone),
    pan_number:
      firstRepayment.pan ||
      firstRepayment.panNumber ||
      firstRepayment.pan_number ||
      crmStatus?.pan ||
      crmStatus?.panNumber ||
      crmStatus?.pan_number ||
      "",
    loan_amount: Number.isFinite(loanAmount) && loanAmount > 0 ? loanAmount : undefined,
    outstanding_amount:
      Number.isFinite(outstandingAmount) && outstandingAmount > 0
        ? outstandingAmount
        : Number.isFinite(maturityAmount) && maturityAmount > 0
          ? Math.max(0, maturityAmount - (Number.isFinite(paidAmount) ? paidAmount : 0))
          : undefined,
    maturity_amount: Number.isFinite(maturityAmount) && maturityAmount > 0 ? maturityAmount : undefined,
    due_date: dueDate,
    tenure_days: Number(sanction.tenureDays || firstRepayment.tenureDays || firstRepayment.tenure_days || 0) || undefined,
    interest_rate: sanction.interestRate || firstRepayment.interestRate || firstRepayment.interest_rate || "",
    interest_accrued: firstRepayment.interestAccrued || firstRepayment.interest_accrued || undefined,
    submit_at:
      crmStatus?.disbursement?.disbursedAt ||
      crmStatus?.disbursement?.disbursalDate ||
      crmStatus?.disbursement?.disbursementDate ||
      sanction.disbursedAt ||
      sanction.disbursalDate ||
      sanction.disbursementDate ||
      firstRepayment.disbursedAt ||
      firstRepayment.disbursed_at ||
      firstRepayment.disbursalDate ||
      firstRepayment.disbursal_date ||
      firstRepayment.disbursementDate ||
      firstRepayment.disbursement_date ||
      firstRepayment.createdAt ||
      firstRepayment.created_at ||
      latestRepayment.paidAt ||
      latestRepayment.paid_at ||
      "",
    repayment_paid_amount: Number.isFinite(paidAmount) ? paidAmount : 0,
    repayment_status: normalizedRepaymentStatus,
    status: String(normalizedRepaymentStatus).toLowerCase() === "paid" ? "paid" : "",
    crm_repayments: repayments,
    crm_repayment_latest: latestRepayment || null,
    crm_repayment: repaymentInfo,
    crm_disbursement: disbursementInfo,
    crm_sanction: sanction,
    crm_status: crmStatus,
    repayment_source: "crm",
  };
};

export const fetchCrmRepaymentDetails = async (identifier) => {
  const normalizedMobile = normalizeMobile(identifier);
  const isMobileLookup = /^[6-9]\d{9}$/.test(normalizedMobile);
  const normalizedPan = normalizePan(identifier);
  const isPanLookup = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizedPan);
  const [repaymentSummary, crmStatus] = await Promise.all([
    (isMobileLookup
      ? Promise.resolve(summarizeCrmRepayments([]))
      : fetchCrmRepayments({
        sourceLeadId: isPanLookup ? "" : identifier,
        loanId: isPanLookup ? "" : identifier,
        panNumber: isPanLookup ? normalizedPan : "",
      })).catch((error) => {
      logger.warn("CRM repayment details repayment fetch failed:", {
        identifier,
        message: error.message,
      });
      return summarizeCrmRepayments([]);
    }),
    (isMobileLookup
      ? fetchCrmLeadStatusByMobile(normalizedMobile)
      : isPanLookup
        ? fetchCrmLeadStatusByPan(normalizedPan)
        : fetchCrmLeadStatusById(identifier)).catch((error) => {
      logger.warn("CRM repayment details loan status fetch failed:", {
        identifier,
        message: error.message,
      });
      return null;
    }),
  ]);

  return buildRepaymentApplicationFromCRM(identifier, repaymentSummary, crmStatus);
};

export const fetchCrmRepayments = async ({ sourceLeadId, loanId, panNumber } = {}) => {
  const identifiers = [
    ["sourceLeadId", sourceLeadId],
    ["loanId", loanId],
    ["panNumber", panNumber],
    ["pan", panNumber],
  ].filter(([, value]) => String(value || "").trim());

  if (identifiers.length === 0) return summarizeCrmRepayments([]);

  let lastError = null;

  for (const [key, value] of identifiers) {
    const url = new URL(CRM_REPAYMENTS_API_URL);
    url.searchParams.set("sourceSystem", "waqtmoney");
    url.searchParams.set(key, String(value).trim());

    try {
      const response = await fetch(url, {
        headers: buildCrmRepaymentHeaders(),
      });
      const data = await readJsonOrText(response);

      if (!response.ok || data?.success === false) {
        const error = new Error(data.message || "Unable to fetch CRM repayments");
        error.statusCode = response.status;
        error.data = data;
        throw error;
      }

      return summarizeCrmRepayments(normalizeRepaymentList(data.data || data));
    } catch (error) {
      lastError = error;
      logger.warn("CRM repayment fetch failed:", {
        key,
        value,
        message: error.message,
      });
    }
  }

  if (lastError) throw lastError;
  return summarizeCrmRepayments([]);
};

export const syncRepaymentToCRM = async (repayment) => {
  const payload = {
    sourceSystem: "waqtmoney",
    sourceLeadId: repayment.sourceLeadId,
    loanId: repayment.loanId,
    amount: Number(repayment.amount || 0),
    method: repayment.method || "ONLINE",
    reference: repayment.reference,
    gateway: repayment.gateway || "cashfree",
    paidAt: repayment.paidAt || new Date().toISOString(),
    status: repayment.status || "success",
  };

  const response = await fetch(CRM_REPAYMENTS_API_URL, {
    method: "POST",
    headers: buildCrmRepaymentHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await readJsonOrText(response);

  if (!response.ok || data?.success === false) {
    const error = new Error(data.message || "Unable to sync repayment to CRM");
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
