import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  CalendarDays,
  Check,
  CircleHelp,
  Clipboard,
  Clock3,
  Copy,
  FileCheck2,
  ListChecks,
  Phone,
  Route,
  Scale,
  Search,
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

const LoanStatus = () => {
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState("");

  const applicationId = getStoredApplicationId();

  useEffect(() => {
    if (!applicationId) {
      setError("Application ID not found.");
      return;
    }

    const loadApplication = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/application/${applicationId}`
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
    application?.application_id || applicationId || "-";

  const progress = 45;

  const summaryItems = useMemo(
    () => [
      ["Loan Amount", formatAmount(application?.loan_amount)],
      ["Loan Purpose", application?.loan_purpose || "-"],
      ["Applicant", application?.full_name || "-"],
      ["Mobile", application?.mobile || "-"],
      ["City", application?.city || "-"],
      ["Income", formatAmount(application?.monthly_income)],
      ["Employment", application?.employment_status || "-"],
      ["Last Updated", formatDateTime(application?.last_activity_at)],
    ],
    [application]
  );

  const verificationItems = [
    ["Mobile verified", "OTP verification completed"],
    ["PAN details", "Identity information captured"],
    ["Aadhaar KYC", "KYC reference stored securely"],
    ["Work details", "Employment profile available"],
    ["Bank details", "Bank account information received"],
    ["Documents", "Required documents uploaded"],
    ["Video KYC", "Customer video verification submitted"],
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
                  Application Submitted
                </h2>

                <p className="mt-2 text-sm text-[#52657d]">
                  Your application is received and queued for verification.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e1ee] bg-[#f8fafc] px-4 py-2 text-xs font-bold text-[#071d3a]">
                    <Clipboard className="h-4 w-4" />
                    {displayApplicationId}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e1ee] bg-[#f8fafc] px-4 py-2 text-xs font-bold text-[#071d3a]">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(application?.last_activity_at)}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e1ee] bg-[#f8fafc] px-4 py-2 text-xs font-bold text-[#071d3a]">
                    <Clock3 className="h-4 w-4" />
                    Usually reviewed within 24–48 hours
                  </span>

                  <span className="rounded-full bg-[#eaf2ff] px-4 py-2 text-xs font-bold text-[#2f6ce5]">
                    Submitted
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
                  {[
                    ["Submitted", "Current stage", FileCheck2, true],
                    ["Verification", "Pending", Search, false],
                    ["Approval", "Pending", Scale, false],
                    ["Disbursal", "Pending", BadgeIndianRupee, false],
                  ].map(([title, subtitle, Icon, active]) => (
                    <div key={String(title)} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${active
                              ? "bg-[#2f6ce5] text-white"
                              : "bg-[#e8eef7] text-[#52657d]"
                            }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        {title !== "Disbursal" && (
                          <span className="h-8 w-px bg-[#d8e1ee]" />
                        )}
                      </div>

                      <div>
                        <p className="font-bold text-[#071d3a]">{title}</p>

                        <p className="mt-1 text-sm text-[#52657d]">
                          {subtitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-[#eaf2ff] p-4 text-sm leading-6 text-[#071d3a]">
                  Next update: Our team will verify your details and documents.
                  Keep your phone reachable for any confirmation call.
                </div>
              </section>

              {/* VERIFICATION */}
              <section className="rounded-2xl border border-[#edf2f7] bg-[#fcfdff] p-5">
                <h3 className="flex items-center gap-2 text-xl font-bold text-[#071d3a]">
                  <ListChecks className="h-5 w-5" />
                  Verification
                </h3>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold text-[#52657d]">
                    <span>7 of 7 complete</span>
                    <span>100%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#dfe7f2]">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-[#2f6ce5] via-[#1597b8] to-[#16b978]" />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {verificationItems.map(([title, subtitle]) => (
                    <div
                      key={title}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#e8edf5] bg-white p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9fff4] text-[#0cbd6b]">
                          <Check className="h-4 w-4" strokeWidth={3} />
                        </span>

                        <div>
                          <p className="text-sm font-bold text-[#071d3a]">
                            {title}
                          </p>

                          <p className="mt-1 text-xs text-[#52657d]">
                            {subtitle}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-[#e9fff4] px-3 py-1 text-xs font-bold text-[#0c8f53]">
                        Done
                      </span>
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
