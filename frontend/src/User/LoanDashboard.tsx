import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CreditCard,
  IndianRupee,
  Loader2,
  LogOut,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { API_BASE_URL } from "@/config/api";

type DashboardLoan = {
  id: string;
  loanId?: string;
  mobile?: string;
  crmApplicationId?: string;
  crmLeadId?: string;
  status: string;
  amount: number;
  requestedLoanAmount?: number;
  approvedLoanAmount?: number;
  totalRepayableAmount?: number;
  outstandingAmount?: number;
  repaymentAmount: number;
  paidAmount?: number;
  dueDate?: string;
  tenureDays?: number | string;
  interestRate?: number | string;
  interestAccrued?: number | string;
  disbursalDate?: string;
  crmRepaymentDetails?: Record<string, unknown>;
  crmStatus?: CrmLeadStatus;
};

type CrmTimelineItem = {
  status?: string;
  stageKey?: string;
  publicStatus?: string;
  title?: string;
  description?: string;
  occurredAt?: string;
  createdAt?: string;
};

type CrmLeadStatus = {
  applicationId?: string;
  crmLeadId?: string;
  customerName?: string;
  phone?: string;
  email?: string;
  loanAmount?: number;
  approvedLoanAmount?: number;
  approvedAmount?: number;
  sanctionedAmount?: number;
  loanType?: string;
  sourceLeadId?: string;
  sourceApplicationId?: string;
  crmStatus?: string;
  statusCode?: string;
  publicStatus?: string;
  currentStage?: string;
  dashboardCurrentStageKey?: string;
  dashboardStatusTitle?: string;
  dashboardStatusDescription?: string;
  dashboardNextExpectedAction?: string;
  dashboardProgressPercent?: number;
  statusTitle?: string;
  statusDescription?: string;
  progressPercent?: number;
  nextExpectedAction?: string;
  isTerminalStatus?: boolean;
  cibilScore?: number;
  lastUpdatedAt?: string;
  sanction?: {
    agreementNumber?: string;
    principalAmount?: number;
    approvedLoanAmount?: number;
    approvedAmount?: number;
    sanctionedAmount?: number;
    disbursedAmount?: number;
    repaymentAmount?: number;
    dueDate?: string;
    pdfAvailable?: boolean;
    pdfUrl?: string;
    emailStatus?: string;
    whatsappStatus?: string;
  };
  disbursement?: {
    status?: string;
  } | null;
  repayment?: {
    status?: string;
    paidAmount?: number;
    balanceAmount?: number;
  } | null;
  timeline?: CrmTimelineItem[];
};

type DashboardData = {
  user?: {
    name?: string;
    mobile?: string;
  };
  credit?: {
    score?: number | null;
    label?: string;
    message?: string;
  };
  loans?: DashboardLoan[];
};

const formatINR = (amount: number) =>
  amount > 0
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "-";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getCreditScorePercent = (score?: number) => {
  const numericScore = Number(score || 0);
  if (!Number.isFinite(numericScore) || numericScore <= 0) return 42;

  return Math.min(100, Math.max(0, Math.round(((numericScore - 300) / 600) * 100)));
};

const InfoBox = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IndianRupee;
  label: string;
  value: string;
}) => (
  <div className="group min-h-[92px] rounded-2xl border border-purple-100 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(91,33,182,0.06)] transition hover:-translate-y-0.5 hover:border-[#d8c5ff] hover:shadow-[0_18px_40px_rgba(91,33,182,0.12)]">
    <div className="flex h-full items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-5 text-[#52657d]">{label}</p>
        <h3 className="mt-1.5 break-words text-[clamp(1.05rem,1.7vw,1.3rem)] font-extrabold leading-tight text-[#071d3a] [overflow-wrap:anywhere]">{value}</h3>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3eaff] text-[#8048e2] transition group-hover:bg-[#8048e2] group-hover:text-white">
        <Icon size={18} />
      </span>
    </div>
  </div>
);

const isRealLoanId = (value?: string | null) => {
  const id = String(value || "").trim();
  return Boolean(id) && !/^WAQTMN-PD-/i.test(id);
};

const getTimelineText = (item?: CrmTimelineItem) =>
  [
    item?.stageKey,
    item?.status,
    item?.publicStatus,
    item?.title,
    item?.description,
  ]
    .join(" ")
    .toLowerCase();

const findTimelineIndex = (items: CrmTimelineItem[], patterns: RegExp[]) => {
  for (let i = items.length - 1; i >= 0; i--) {
    if (patterns.some((pattern) => pattern.test(getTimelineText(items[i])))) {
      return i;
    }
  }
  return -1;
};

const getCurrentTimelineIndex = (items: CrmTimelineItem[], status?: CrmLeadStatus) => {
  const dashboardStageKey = String(status?.dashboardCurrentStageKey || "").toLowerCase();
  const dashboardStagePatterns: Record<string, RegExp[]> = {
    loan_disbursed: [/loan\s+disbursed/, /\bdisbursed\b/],
    repayment_received: [/repayment\s+received/, /\brepayment\b.*\breceived\b/],
    sent_to_accounts: [/sent\s+to\s+accounts/, /queued\s+for\s+disbursement/],
  };

  if (dashboardStageKey) {
    const dashboardIndex = findTimelineIndex(items, dashboardStagePatterns[dashboardStageKey] || [
      new RegExp(dashboardStageKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    ]);

    if (dashboardIndex >= 0) return dashboardIndex;
  }

  const currentStage = String(status?.currentStage || status?.statusCode || "").toLowerCase();
  const matchedIndex = items.findIndex((item) =>
    String(item.stageKey || item.status || item.publicStatus || "").toLowerCase() === currentStage
  );

  if (matchedIndex >= 0) return matchedIndex;

  const statusIndex = findTimelineIndex(items, [
    new RegExp(currentStage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  ]);
  if (currentStage && statusIndex >= 0) return statusIndex;

  return Math.max(0, items.length - 1);
};

const ProcessTimeline = ({
  items,
  status,
}: {
  items: CrmTimelineItem[];
  status?: CrmLeadStatus;
}) => {
  if (!items.length) return null;

  const currentIndex = getCurrentTimelineIndex(items, status);
  const visibleItems = items.slice(0, currentIndex + 1);
  const useTimelineProgress = Boolean(status?.dashboardCurrentStageKey);
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      Number(
        useTimelineProgress
          ? ((currentIndex + 1) / items.length) * 100
          : status?.dashboardProgressPercent ?? status?.progressPercent ?? ((currentIndex + 1) / items.length) * 100
      )
    )
  );
  const showNextStep =
    !["loan_disbursed", "repayment_received"].includes(String(status?.dashboardCurrentStageKey || "")) &&
    Boolean(status?.dashboardNextExpectedAction || status?.nextExpectedAction);
  const currentItem = items[currentIndex] || items[items.length - 1];
  const lastUpdated = status?.lastUpdatedAt || currentItem?.occurredAt || currentItem?.createdAt;

  return (
    <div className="overflow-hidden rounded-[30px] border border-purple-100 bg-white shadow-[0_24px_80px_rgba(91,33,182,0.12)]">
      <div className="h-1.5 bg-gradient-to-r from-[#8048e2] via-[#bd56e4] to-[#f59e0b]" />
      <div className="px-5 py-6 sm:px-8">
        <div className="rounded-[24px] border border-purple-100 bg-[linear-gradient(135deg,#fbfaff_0%,#ffffff_58%,#fff7ed_100%)] p-5 shadow-[0_14px_40px_rgba(91,33,182,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-[#8048e2]">Loan Status</p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight text-[#071d3a] sm:text-3xl">
                {status?.dashboardStatusTitle || status?.statusTitle || status?.publicStatus || "Application progress"}
              </h2>
              {lastUpdated && (
                <p className="mt-2 text-xs font-bold text-[#52657d]">
                  Last updated: {formatDateTime(lastUpdated)}
                </p>
              )}
            </div>

            <div className="min-w-full rounded-2xl border border-white bg-white/80 px-4 py-4 shadow-[0_10px_30px_rgba(91,33,182,0.08)] lg:min-w-[360px]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-[#52657d]">Progress</p>
                  <p className="mt-1 text-3xl font-extrabold text-[#8048e2]">{Math.round(progressPercent)}%</p>
                </div>
                <p className="text-right text-xs font-bold leading-5 text-[#52657d]">
                  {visibleItems.length} steps completed
                </p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#ebe3ff]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8048e2] via-[#bd56e4] to-[#f59e0b]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {showNextStep && (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-white/80 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-amber-700">Next Step</p>
              <p className="mt-1 text-sm font-extrabold text-[#071d3a]">
                {status.dashboardNextExpectedAction || status.nextExpectedAction}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-[24px] border border-purple-100 bg-[#fbfaff] px-4 py-5 sm:px-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-[#071d3a]">Tracking Details</h3>
              <p className="mt-1 text-xs font-bold text-[#52657d]">Live updates from CRM</p>
            </div>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#8048e2] ring-1 ring-purple-100">
              {status?.crmStatus || status?.publicStatus || "Active"}
            </span>
          </div>

          <div className="relative mx-auto max-w-[760px]">
            {visibleItems.map((item, index) => {
              const isDone = index <= currentIndex;
              const isCurrent = index === currentIndex;
              const isLast = index === visibleItems.length - 1;

              return (
                <div
                  key={`${item.stageKey || item.title || "stage"}-${index}`}
                  className="relative grid grid-cols-[34px_1fr] gap-4 pb-7 last:pb-0"
                >
                <div className="relative flex justify-center">
                  {!isLast && (
                    <span
                      className={`absolute left-1/2 top-7 h-[calc(100%-16px)] w-[2px] -translate-x-1/2 ${
                        index < currentIndex ? "bg-[#8048e2]" : "bg-slate-200"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex items-center justify-center rounded-full ${
                      isCurrent
                        ? "h-8 w-8 bg-[#f59e0b] text-white ring-8 ring-amber-100"
                        : isDone
                          ? "h-7 w-7 bg-[#8048e2] text-white"
                          : "h-7 w-7 border-2 border-slate-300 bg-white"
                    }`}
                  >
                    {isDone && <ShieldCheck size={15} />}
                  </span>
                </div>
                <div
                  className={`-mt-1 min-w-0 rounded-2xl border px-4 py-3 ${
                    isCurrent
                      ? "border-amber-200 bg-white shadow-[0_14px_34px_rgba(245,158,11,0.16)]"
                      : isDone
                        ? "border-purple-100 bg-white"
                        : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-base font-extrabold ${isDone ? "text-[#071d3a]" : "text-slate-400"}`}>
                      {item.title || item.publicStatus || item.status || "Application update"}
                    </p>
                    {isCurrent && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700 ring-1 ring-amber-100">
                        Current
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className={`mt-1 text-sm font-semibold leading-5 ${isDone ? "text-[#52657d]" : "text-slate-400"}`}>
                      {item.description}
                    </p>
                  )}
                  {(item.occurredAt || item.createdAt) && (
                    <p className={`mt-1 text-xs font-bold ${isDone ? "text-slate-500" : "text-slate-400"}`}>
                      {formatDateTime(item.occurredAt || item.createdAt)}
                    </p>
                  )}
                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const LoanDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingRepayment, setOpeningRepayment] = useState(false);
  const [error, setError] = useState("");

  const userName = useMemo(() => {
    const authUser = sessionStorage.getItem("authUser");
    if (data?.user?.name) return data.user.name;

    try {
      return JSON.parse(authUser || "{}")?.name || "Customer";
    } catch {
      return "Customer";
    }
  }, [data]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/auth/dashboard`, {
          credentials: "include",
        });
        const result = await response.json().catch(() => ({}));

        if (response.status === 401) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          sessionStorage.removeItem("authUser");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          setError(result.message || result.error || "Unable to load dashboard");
          return;
        }

        setData(result.data || null);
      } catch (fetchError) {
        console.error("Dashboard load error:", fetchError);
        setError("Server not reachable");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (logoutError) {
      console.error("Logout error:", logoutError);
    }

    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    sessionStorage.removeItem("authUser");
    navigate("/login");
  };

  const openRepayment = async (loan?: DashboardLoan) => {
    if (openingRepayment) return;

    if (!loan?.id) {
      navigate("/repayment");
      return;
    }

    setOpeningRepayment(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/repayment-session`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: loan.id,
          loanId: loan.id,
          crmLoanId: loan.loanId || "",
          mobile: loan.mobile || "",
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.message || "Please verify PAN/OTP to continue repayment");
        navigate("/repayment");
        return;
      }

      const repaymentData = result.data || {};
      sessionStorage.setItem("repaymentApplicationId", repaymentData.applicationId || loan.id);
      if (repaymentData.mobile || loan.mobile) {
        sessionStorage.setItem("repaymentMobile", repaymentData.mobile || loan.mobile || "");
      }
      if (isRealLoanId(repaymentData.loanId || loan.loanId)) {
        sessionStorage.setItem("repaymentLoanId", repaymentData.loanId || loan.loanId || "");
      } else {
        sessionStorage.removeItem("repaymentLoanId");
      }
      navigate("/repayment/make-payment");
    } catch (fetchError) {
      console.error("Repayment session error:", fetchError);
      setError("Unable to open repayment. Please verify PAN/OTP once.");
      navigate("/repayment");
    } finally {
      setOpeningRepayment(false);
    }
  };

  const loans = data?.loans || [];
  const latestLoan = loans[0];
  const latestCrmStatus = latestLoan?.crmStatus || null;
  const displayName = latestCrmStatus?.customerName || userName;
  const cibilScore = Number(latestCrmStatus?.cibilScore || 0);
  const creditScorePercent = getCreditScorePercent(cibilScore);
  const latestTimeline = latestCrmStatus?.timeline || [];
  const latestTimelineIndex = latestTimeline.length ? getCurrentTimelineIndex(latestTimeline, latestCrmStatus) : -1;
  const latestUsesTimelineProgress = Boolean(latestCrmStatus?.dashboardCurrentStageKey && latestTimeline.length);
  const applicationProgress = Math.min(
    100,
    Math.max(
      0,
      Number(
        latestUsesTimelineProgress
          ? ((latestTimelineIndex + 1) / latestTimeline.length) * 100
          : latestCrmStatus?.dashboardProgressPercent ?? latestCrmStatus?.progressPercent ?? 0
      )
    )
  );
  const showLatestNextStep =
    !["loan_disbursed", "repayment_received"].includes(String(latestCrmStatus?.dashboardCurrentStageKey || "")) &&
    Boolean(latestCrmStatus?.dashboardNextExpectedAction || latestCrmStatus?.nextExpectedAction);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f1ff_0%,#fbfaff_44%,#ffffff_100%)] px-4 py-7 font-sans text-slate-950">
      <div className="mx-auto max-w-[1120px] space-y-7">
        <div className="relative overflow-hidden rounded-[30px] border border-purple-100 bg-white px-5 py-6 shadow-[0_28px_90px_rgba(91,33,182,0.14)] sm:px-8 sm:py-8">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#8048e2] via-[#bd56e4] to-[#f59e0b]" />
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#f3eaff] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#8048e2]">
                <Sparkles size={14} /> Waqt Money Dashboard
              </div>
              <h1 className="text-2xl font-extrabold leading-tight text-[#071d3a] sm:text-[32px]">
                Welcome back, {displayName.toUpperCase()}!
              </h1>
              <p className="mt-2 text-sm font-semibold text-[#52657d]">
                Keep your profile updated for faster loan processing.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-4 py-2 text-xs font-extrabold text-green-700">
                  <ShieldCheck size={14} /> Secure Account
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openRepayment(latestLoan)}
                disabled={openingRepayment}
                className="flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] px-4 text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90"
              >
                {openingRepayment ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Repay
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white shadow-[0_9px_18px_rgba(220,38,38,0.18)] transition hover:bg-red-700"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-6 rounded-[22px] border border-purple-100 bg-[#fbfaff] px-5 py-6 shadow-[0_14px_34px_rgba(91,33,182,0.08)] sm:flex-row sm:items-center sm:px-8 sm:py-8">
              <div className="relative h-[105px] w-[150px] shrink-0">
                <div className="absolute left-0 top-0 h-[75px] w-[150px] overflow-hidden">
                  <div className="h-[150px] w-[150px] rotate-[-45deg] rounded-full border-[12px] border-transparent border-l-red-300 border-t-red-300" />
                  <div className="absolute left-0 top-0 h-[150px] w-[150px] rotate-[10deg] rounded-full border-[12px] border-transparent border-t-amber-200" />
                  <div className="absolute left-0 top-0 h-[150px] w-[150px] rotate-[55deg] rounded-full border-[12px] border-transparent border-t-[#a78bfa]" />
                </div>
                <span
                  className="absolute top-[66px] h-3.5 w-3.5 rounded-full bg-[#8048e2]"
                  style={{ left: `${Math.max(1, Math.min(136, (creditScorePercent / 100) * 136))}px` }}
                />
                <p className="absolute left-[38px] top-[42px] text-xs font-semibold text-[#52657d]">Credit Score</p>
                <p className="absolute left-[49px] top-[57px] text-xl font-extrabold text-[#071d3a]">
                  {cibilScore > 0 ? cibilScore : "-"}
                </p>
                <p className="absolute bottom-0 left-0 text-xs font-semibold text-[#52657d]">300</p>
                <p className="absolute bottom-0 right-0 text-xs font-semibold text-[#52657d]">900</p>
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#071d3a]">
                  {latestCrmStatus?.dashboardStatusTitle || latestCrmStatus?.statusTitle || latestCrmStatus?.publicStatus || "Credit Review"}
                </h2>
                <p className="mt-4 max-w-[300px] text-sm font-medium leading-5 text-[#52657d]">
                  {latestCrmStatus?.dashboardStatusDescription || latestCrmStatus?.statusDescription || "Your profile will update as your application progresses."}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#ebe3ff]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8048e2] to-[#bd56e4]"
                    style={{ width: `${applicationProgress}%` }}
                  />
                </div>
                {showLatestNextStep && (
                  <p className="mt-2 text-xs font-bold text-[#8048e2]">
                    {latestCrmStatus.dashboardNextExpectedAction || latestCrmStatus.nextExpectedAction}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 rounded-[22px] border border-purple-100 bg-[#fbfaff] px-5 py-5 shadow-[0_14px_34px_rgba(91,33,182,0.06)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f3eaff] text-[#8048e2]">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#071d3a]">Financial Tip of the Day</h3>
                <p className="mt-2 max-w-[460px] text-sm font-medium leading-5 text-[#52657d]">
                  Keep your KYC documents updated to ensure quick processing of future loan requests.
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex min-h-[220px] items-center justify-center rounded-[26px] border border-purple-100 bg-white shadow-[0_24px_80px_rgba(91,33,182,0.10)]">
            <Loader2 className="h-8 w-8 animate-spin text-[#8048e2]" />
          </div>
        )}

        {error && <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{error}</div>}

        {!loading && latestCrmStatus?.timeline?.length ? (
          <ProcessTimeline items={latestCrmStatus.timeline} status={latestCrmStatus} />
        ) : null}

        {!loading && !error && loans.length === 0 && (
          <div className="rounded-[26px] border border-purple-100 bg-white px-6 py-8 text-center shadow-[0_24px_80px_rgba(91,33,182,0.10)]">
            <ShieldCheck className="mx-auto h-10 w-10 text-[#8048e2]" />
            <h2 className="mt-3 text-xl font-extrabold text-[#071d3a]">No  loans found</h2>
           
            <button
              type="button"
              onClick={() => navigate("/user/apply")}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] px-5 text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90"
            >
              <Plus size={16} /> Apply Now
            </button>
          </div>
        )}

        {loans.map((loan) => {
          const crmStatus = loan.crmStatus;
          const requestedLoanAmount = Number(loan.requestedLoanAmount || 0);
          const approvedLoanAmount = Number(loan.approvedLoanAmount || 0);
          const totalRepayableAmount = Number(loan.totalRepayableAmount || 0);
          const outstandingAmount = Number(loan.outstandingAmount || 0);
          const paidAmount = Number(loan.paidAmount || 0);
          const interestAccrued = Number(loan.interestAccrued || 0);
          const dueDateValue = crmStatus
            ? formatDateTime(loan.dueDate || crmStatus.lastUpdatedAt)
            : formatDateTime(loan.dueDate);
          const detailCards = [
            { icon: IndianRupee, label: "Requested Loan Amount", value: formatINR(requestedLoanAmount) },
            { icon: ShieldCheck, label: "Approved Loan Amount", value: formatINR(approvedLoanAmount) },
            { icon: ReceiptText, label: "Outstanding Amount", value: formatINR(outstandingAmount) },
            { icon: CalendarDays, label: "Disbursal Date", value: formatDate(loan.disbursalDate) },
            { icon: CalendarDays, label: loan.dueDate ? "Due Date" : "Last Updated", value: dueDateValue },
            { icon: ReceiptText, label: "Total Repayable", value: formatINR(totalRepayableAmount) },
            { icon: IndianRupee, label: "Paid Amount", value: formatINR(paidAmount) },
            { icon: ReceiptText, label: "Interest Rate", value: loan.interestRate ? String(loan.interestRate) : "-" },
            { icon: IndianRupee, label: "Interest Accrued", value: formatINR(interestAccrued) },
            ...(crmStatus?.sanction
              ? [
                  {
                    icon: ReceiptText,
                    label: "Agreement No.",
                    value: crmStatus.sanction.agreementNumber || "-",
                  },
                  {
                    icon: IndianRupee,
                    label: "Disbursed Amount",
                    value: formatINR(Number(crmStatus.sanction.disbursedAmount || 0)),
                  },
                  {
                    icon: ShieldCheck,
                    label: "Disbursement",
                    value: crmStatus.disbursement?.status || "-",
                  },
                ]
              : []),
          ];

          return (
            <div key={loan.id} className="overflow-hidden rounded-[30px] border border-purple-100 bg-white shadow-[0_24px_80px_rgba(91,33,182,0.10)]">
              <div className="h-1 bg-gradient-to-r from-[#8048e2] via-[#bd56e4] to-[#f59e0b]" />
              <div className="px-5 py-6 sm:px-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="min-w-0 break-words text-xl font-extrabold leading-tight text-[#071d3a] [overflow-wrap:anywhere]">
                      Loan #{loan.id}
                    </h2>
                    {(crmStatus?.publicStatus || crmStatus?.crmStatus) && (
                      <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-700 ring-1 ring-green-100">
                        {crmStatus.publicStatus || crmStatus.crmStatus}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openRepayment(loan)}
                    disabled={openingRepayment}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] px-4 text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90 md:w-fit"
                  >
                    {openingRepayment ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Repay
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {detailCards.map((card) => (
                    <InfoBox key={card.label} icon={card.icon} label={card.label} value={card.value} />
                  ))}
                </div>

                {crmStatus?.statusDescription && (
                  <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 px-4 py-4">
                    <p className="text-sm font-extrabold text-green-800">
                      {crmStatus.dashboardStatusTitle || crmStatus.statusTitle || crmStatus.publicStatus || "Application status"}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-green-700">
                      {crmStatus.dashboardStatusDescription || crmStatus.statusDescription}
                    </p>
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoanDashboard;
