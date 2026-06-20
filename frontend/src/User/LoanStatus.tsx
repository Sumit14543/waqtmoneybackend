import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleHelp,
  Clipboard,
  Copy,
  FileCheck2,
  ListChecks,
  Phone,
  Route,
} from "lucide-react";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";

import { API_BASE_URL } from "@/config/api";

type Application = {
  application_id?: string;
  loan_amount?: number | string;
  loan_purpose?: string;
  full_name?: string;
  mobile?: string;
  city?: string;
  monthly_income?: number | string;
  employment_status?: string;
  last_activity_at?: string;
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
  customerName?: string;
  phone?: string;
  crmStatus?: string;
  publicStatus?: string;
  currentStage?: string;
  statusCode?: string;
  dashboardCurrentStageKey?: string;
  dashboardStatusTitle?: string;
  dashboardStatusDescription?: string;
  dashboardNextExpectedAction?: string;
  dashboardProgressPercent?: number;
  statusTitle?: string;
  statusDescription?: string;
  progressPercent?: number;
  nextExpectedAction?: string;
  lastUpdatedAt?: string;
  timeline?: CrmTimelineItem[];
  disbursement?: {
    status?: string;
  } | null;
  repayment?: {
    status?: string;
    paidAmount?: number;
    balanceAmount?: number;
    totalAmount?: number;
  } | null;
  sanction?: {
    agreementNumber?: string;
    disbursedAmount?: number;
    dueDate?: string;
  };
};

type DashboardLoan = {
  id: string;
  loanId?: string;
  mobile?: string;
  amount?: number;
  requestedLoanAmount?: number;
  approvedLoanAmount?: number;
  totalRepayableAmount?: number;
  outstandingAmount?: number;
  paidAmount?: number;
  dueDate?: string;
  disbursalDate?: string;
  crmStatus?: CrmLeadStatus;
};

const getStoredApplicationId = () =>
  sessionStorage.getItem("applicationId") ||
  localStorage.getItem("applicationId") ||
  "";

const readJsonResponse = async (res: Response) => {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: "Server returned an invalid response" };
  }
};

const formatAmount = (value?: number | string) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount <= 0) return "-";

  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
};

const formatDate = (value?: string) => {
  if (!value)
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date());

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
    const index = findTimelineIndex(items, dashboardStagePatterns[dashboardStageKey] || [
      new RegExp(dashboardStageKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    ]);

    if (index >= 0) return index;
  }

  const currentStage = String(status?.currentStage || status?.statusCode || "").toLowerCase();
  const exactIndex = items.findIndex((item) =>
    String(item.stageKey || item.status || item.publicStatus || "").toLowerCase() === currentStage
  );

  if (exactIndex >= 0) return exactIndex;

  if (currentStage) {
    const textIndex = findTimelineIndex(items, [
      new RegExp(currentStage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    ]);

    if (textIndex >= 0) return textIndex;
  }

  return Math.max(0, items.length - 1);
};

const LoanStatus = () => {
  const [application, setApplication] = useState<Application | null>(null);
  const [dashboardLoan, setDashboardLoan] = useState<DashboardLoan | null>(null);
  const [error, setError] = useState("");

  const applicationId = getStoredApplicationId();

  useEffect(() => {
    if (!applicationId) {
      setError("Application ID not found.");
      return;
    }

    const loadApplication = async () => {
      try {
        const dashboardResponse = await fetch(`${API_BASE_URL}/auth/dashboard`, {
          credentials: "include",
        });
        const dashboardResult = await readJsonResponse(dashboardResponse);

        if (dashboardResponse.ok) {
          const loans: DashboardLoan[] = dashboardResult.data?.loans || [];
          const matchingLoan =
            loans.find((loan) => loan.id === applicationId || loan.loanId === applicationId) ||
            loans[0] ||
            null;

          if (matchingLoan) {
            setDashboardLoan(matchingLoan);
            return;
          }
        }

        const response = await fetch(
          `${API_BASE_URL}/application/${applicationId}`,
          {
            credentials: "include",
          }
        );

        const result = await readJsonResponse(response);

        if (!response.ok) {
          setError(result.message || "Unable to load application status");
          return;
        }

        setApplication(result.data || null);
      } catch (fetchError) {
        console.error("Application status fetch error:", fetchError);
        setError("Server not reachable");
      }
    };

    loadApplication();
  }, [applicationId]);

  const displayApplicationId =
    dashboardLoan?.id || application?.application_id || applicationId || "-";

  const crmStatus = dashboardLoan?.crmStatus || null;
  const rawTimeline = crmStatus?.timeline || [];
  const currentTimelineIndex = rawTimeline.length ? getCurrentTimelineIndex(rawTimeline, crmStatus || undefined) : -1;
  const visibleTimeline =
    currentTimelineIndex >= 0 ? rawTimeline.slice(0, currentTimelineIndex + 1) : rawTimeline;
  const useTimelineProgress = Boolean(crmStatus?.dashboardCurrentStageKey && rawTimeline.length);
  const progress = Math.min(
    100,
    Math.max(
      0,
      Number(
        useTimelineProgress
          ? ((currentTimelineIndex + 1) / rawTimeline.length) * 100
          : crmStatus?.dashboardProgressPercent ??
          crmStatus?.progressPercent ??
          (rawTimeline.length && currentTimelineIndex >= 0
            ? ((currentTimelineIndex + 1) / rawTimeline.length) * 100
            : 0)
      )
    )
  );
  const currentTimelineItem =
    currentTimelineIndex >= 0 ? rawTimeline[currentTimelineIndex] : undefined;
  const liveStatusTitle =
    crmStatus?.dashboardStatusTitle ||
    crmStatus?.statusTitle ||
    crmStatus?.publicStatus ||
    currentTimelineItem?.title ||
    currentTimelineItem?.publicStatus ||
    "Application status";
  const liveStatusDescription =
    crmStatus?.dashboardStatusDescription ||
    crmStatus?.statusDescription ||
    currentTimelineItem?.description ||
    "Live status will appear here once CRM updates this application.";
  const liveLastUpdated =
    crmStatus?.lastUpdatedAt ||
    currentTimelineItem?.occurredAt ||
    currentTimelineItem?.createdAt ||
    application?.last_activity_at;
  const showNextStep =
    !["loan_disbursed", "repayment_received"].includes(String(crmStatus?.dashboardCurrentStageKey || "")) &&
    Boolean(crmStatus?.dashboardNextExpectedAction || crmStatus?.nextExpectedAction);

  const summaryItems = useMemo(
    () => [
      ["Loan Amount", formatAmount(dashboardLoan?.approvedLoanAmount || dashboardLoan?.amount || application?.loan_amount)],
      ["Loan Purpose", application?.loan_purpose || "-"],
      ["Applicant", crmStatus?.customerName || application?.full_name || "-"],
      ["Mobile", dashboardLoan?.mobile || crmStatus?.phone || application?.mobile || "-"],
      ["City", application?.city || "-"],
      ["Income", formatAmount(application?.monthly_income)],
      ["Employment", application?.employment_status || "-"],
      ["Last Updated", formatDateTime(liveLastUpdated)],
    ],
    [
      application,
      crmStatus?.customerName,
      crmStatus?.phone,
      dashboardLoan,
      liveLastUpdated,
    ]
  );

  const crmSummaryItems = [
    ["CRM Status", crmStatus?.crmStatus || crmStatus?.publicStatus || "-"],
    ["Current Stage", crmStatus?.currentStage || crmStatus?.statusCode || "-"],
    ["Disbursement", crmStatus?.disbursement?.status || "-"],
    ["Repayment", crmStatus?.repayment?.status || "-"],
    ["Outstanding", formatAmount(dashboardLoan?.outstandingAmount)],
    ["Paid Amount", formatAmount(dashboardLoan?.paidAmount)],
  ];

  const copyApplicationId = async () => {
    try {
      await navigator.clipboard.writeText(displayApplicationId);
    } catch (copyError) {
      console.error("Copy application ID failed:", copyError);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#eef2f7]">
      <Navbar />

      <main className="mx-auto grid w-full max-w-[1120px] flex-1 items-start gap-5 px-4 pb-10 pt-24 md:pt-28 lg:grid-cols-[1fr_340px]">
        {/* LEFT SECTION */}
        <section className="overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white shadow-sm">
          {/* TOP BAR */}
          <div className="flex flex-col gap-4 border-b border-[#dfe7f2] px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-lg font-bold text-[#071d3a]">
                Loan Application Workspace
              </h1>

              <p className="mt-1 text-sm text-[#52657d]">
                Status, verification progress, and next steps in one place.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyApplicationId}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d8e1ee] bg-white px-4 text-sm font-semibold text-[#071d3a] transition hover:bg-[#f8fafc]"
              >
                <Copy className="h-4 w-4" />
                Copy ID
              </button>

              <a
                href="tel:9217086608"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d8e1ee] bg-white px-4 text-sm font-semibold text-[#071d3a] transition hover:bg-[#f8fafc]"
              >
                <CircleHelp className="h-4 w-4" />
                Help
              </a>
            </div>
          </div>

          {/* BODY */}
          <div className="px-6 py-7 md:px-8">
            {error && (
              <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            {/* APPLICATION STATUS */}
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2f6ce5] text-white">
                  <Check className="h-6 w-6" strokeWidth={3} />
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-[#071d3a]">
                  {liveStatusTitle}
                </h2>

                <p className="mt-2 text-sm text-[#52657d]">
                  {liveStatusDescription}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e1ee] bg-[#f8fafc] px-4 py-2 text-xs font-bold text-[#071d3a]">
                    <Clipboard className="h-4 w-4" />
                    {displayApplicationId}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e1ee] bg-[#f8fafc] px-4 py-2 text-xs font-bold text-[#071d3a]">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(liveLastUpdated)}
                  </span>

                  <span className="rounded-full bg-[#eaf2ff] px-4 py-2 text-xs font-bold text-[#2f6ce5]">
                    {crmStatus?.publicStatus || crmStatus?.crmStatus || "Live CRM"}
                  </span>
                </div>
              </div>
            </div>

            {/* PROGRESS */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-[#52657d]">
                <span>Application Progress</span>
                <span>{progress}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#dfe7f2]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2f6ce5] via-[#1597b8] to-[#16b978]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* GRID */}
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {/* TIMELINE */}
              <section className="rounded-2xl border border-[#edf2f7] bg-[#fcfdff] p-5">
                <h3 className="flex items-center gap-2 text-xl font-bold text-[#071d3a]">
                  <Route className="h-5 w-5" />
                  Decision Timeline
                </h3>

                <div className="mt-6 space-y-5">
                  {visibleTimeline.length > 0 ? (
                    visibleTimeline.map((item, index) => {
                      const isCurrent = index === visibleTimeline.length - 1;
                      const title = item.title || item.publicStatus || item.status || "CRM update";
                      const updatedAt = item.occurredAt || item.createdAt;

                      return (
                        <div key={`${title}-${index}`} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                                isCurrent ? "bg-[#2f6ce5] text-white" : "bg-[#e9fff4] text-[#0cbd6b]"
                              }`}
                            >
                              <Check className="h-4 w-4" strokeWidth={3} />
                            </span>

                            {index !== visibleTimeline.length - 1 && (
                              <span className="h-8 w-px bg-[#d8e1ee]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-[#071d3a]">{title}</p>
                              {isCurrent && (
                                <span className="rounded-full bg-[#eaf2ff] px-2.5 py-1 text-[11px] font-bold text-[#2f6ce5]">
                                  Current
                                </span>
                              )}
                            </div>

                            {item.description && (
                              <p className="mt-1 text-sm text-[#52657d]">{item.description}</p>
                            )}

                            {updatedAt && (
                              <p className="mt-1 text-xs font-semibold text-[#52657d]">
                                {formatDateTime(updatedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-[#e8edf5] bg-white p-4 text-sm font-semibold text-[#52657d]">
                      CRM timeline is not available for this application yet.
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-xl bg-[#eaf2ff] p-4 text-sm leading-6 text-[#071d3a]">
                  {showNextStep
                    ? crmStatus?.dashboardNextExpectedAction || crmStatus?.nextExpectedAction
                    : "This timeline is fetched from CRM and updates when CRM status changes."}
                </div>
              </section>

              {/* CRM STATUS */}
              <section className="rounded-2xl border border-[#edf2f7] bg-[#fcfdff] p-5">
                <h3 className="flex items-center gap-2 text-xl font-bold text-[#071d3a]">
                  <ListChecks className="h-5 w-5" />
                  CRM Status
                </h3>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold text-[#52657d]">
                    <span>Live CRM progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#dfe7f2]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2f6ce5] via-[#1597b8] to-[#16b978]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {crmSummaryItems.map(([title, value]) => (
                    <div
                      key={title}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#e8edf5] bg-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9fff4] text-[#0cbd6b]">
                          <ListChecks className="h-4 w-4" />
                        </span>

                        <div>
                          <p className="text-sm font-bold text-[#071d3a]">
                            {title}
                          </p>

                          <p className="mt-1 text-xs text-[#52657d]">
                            {value}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-5">
          {/* SUMMARY */}
          <section className="rounded-2xl border border-[#dfe7f2] bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#071d3a]">
              <FileCheck2 className="h-5 w-5" />
              Application Summary
            </h2>

            <div className="mt-5 divide-y divide-[#eef2f7]">
              {summaryItems.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <span className="text-sm font-medium text-[#52657d]">
                    {label}
                  </span>

                  <span className="text-right text-sm font-bold text-[#071d3a]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* SUPPORT */}
          <section className="rounded-2xl border border-[#dfe7f2] bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[#071d3a]">
              <CircleHelp className="h-5 w-5" />
              Need Assistance?
            </h2>

            <div className="mt-4 rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-4 text-sm leading-6 text-[#071d3a]">
              Keep your application ID ready when contacting support. Our team
              may call you if more information is required.
            </div>

            <a
              href="tel:9217086608"
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2f6ce5] text-sm font-bold text-white transition hover:bg-[#1f5ed7]"
            >
              Contact Support
              <Phone className="h-4 w-4" />
            </a>

            <a
              href="https://wa.me/919217086608"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-12 items-center justify-center rounded-xl border border-[#2f6ce5] text-sm font-bold text-[#2f6ce5] transition hover:bg-[#eef4ff]"
            >
              Chat Support
            </a>
          </section>
        </aside>
      </main>

      <Footer />
    </div>
  );
};

export default LoanStatus;
