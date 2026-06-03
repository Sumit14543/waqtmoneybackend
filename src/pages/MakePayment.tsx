import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  IndianRupee,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";

import { API_BASE_URL } from "@/config/api";
const CASHFREE_SDK_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget?: "_self" | "_blank" | "_top" | "_modal" }) => Promise<unknown>;
    };
  }
}

type Application = {
  application_id?: string;
  loan_id?: string;
  loan_amount?: number | string;
  principal_amount?: number | string;
  loan_purpose?: string;
  full_name?: string;
  mobile?: string;
  pan_number?: string;
  submit_at?: string;
  last_activity_at?: string;
  repayment_paid_amount?: number | string;
  repayment_status?: string;
  status?: string;
  outstanding_amount?: number | string;
  maturity_amount?: number | string;
  total_repayable_amount?: number | string;
  next_payment_amount?: number | string;
  paid_amount?: number | string;
  payment_status?: string;
  due_date?: string;
  repayment_due_date?: string;
  tenure_days?: number | string;
  interest_rate?: number | string;
  interest_accrued?: number | string;
  repayment_source?: string;
};

const readJsonResponse = async (res: Response) => {
  const text = await res.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: "Server returned an invalid response" };
  }
};

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

const formatLimit = (value: number) => formatINR(value).replace("₹", "Rs ");

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

const getStoredRepaymentApplicationId = () =>
  sessionStorage.getItem("repaymentApplicationId") || "";

const isRealLoanId = (value?: string | null) => {
  const id = String(value || "").trim();
  return Boolean(id) && !/^WAQTMN-PD-/i.test(id);
};

const isApplicationStyleId = (value?: string | null) =>
  /^WAQTMN-PD-/i.test(String(value || "").trim());

const getStoredRepaymentLoanId = () =>
  isRealLoanId(sessionStorage.getItem("repaymentLoanId"))
    ? sessionStorage.getItem("repaymentLoanId") || ""
    : "";

const getStoredRepaymentMobile = () =>
  sessionStorage.getItem("repaymentMobile") || "";

const getStoredRepaymentAccessToken = () =>
  sessionStorage.getItem("repaymentAccessToken") || "";

const loadCashfreeSdk = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${CASHFREE_SDK_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Cashfree checkout")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = CASHFREE_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Cashfree checkout"));
    document.body.appendChild(script);
  });

const MakePayment = () => {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState<"full" | "part">("full");
  const [partAmount, setPartAmount] = useState("");
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [error, setError] = useState("");
  const [showReloanOffer, setShowReloanOffer] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const returnedOrderId = queryParams.get("order_id") || "";
  const rawReturnedLoanId = queryParams.get("loan_id") || "";
  const loanIdIsApplicationId = isApplicationStyleId(rawReturnedLoanId);
  const returnedApplicationId = queryParams.get("application_id") || (loanIdIsApplicationId ? rawReturnedLoanId : "");
  const returnedLoanId = isRealLoanId(rawReturnedLoanId) ? rawReturnedLoanId : "";
  const returnedMobile = queryParams.get("mobile") || "";
  const applicationId = returnedApplicationId || getStoredRepaymentApplicationId();
  const repaymentLoanId = returnedLoanId || getStoredRepaymentLoanId();
  const repaymentMobile = returnedMobile || getStoredRepaymentMobile();
  const repaymentLookupId = repaymentMobile || repaymentLoanId || applicationId;
  const repaymentAccessToken = getStoredRepaymentAccessToken();
  const invalidReturnedLoanId = Boolean(
    rawReturnedLoanId && !isRealLoanId(rawReturnedLoanId) && !loanIdIsApplicationId
  );

  useEffect(() => {
    if (loanIdIsApplicationId) {
      sessionStorage.setItem("repaymentApplicationId", rawReturnedLoanId);
      sessionStorage.removeItem("repaymentLoanId");

      const params = new URLSearchParams(window.location.search);
      params.delete("loan_id");
      params.set("application_id", rawReturnedLoanId);
      navigate(`/repayment/make-payment?${params.toString()}`, { replace: true });
      return;
    }

    if (invalidReturnedLoanId) {
      sessionStorage.removeItem("repaymentLoanId");
      const storedMobile = returnedMobile || getStoredRepaymentMobile();
      navigate(
        storedMobile
          ? `/repayment/make-payment?mobile=${encodeURIComponent(storedMobile)}`
          : "/repayment",
        { replace: true }
      );
      return;
    }

    if (returnedApplicationId) {
      sessionStorage.setItem("repaymentApplicationId", returnedApplicationId);
    }
    if (returnedLoanId) {
      sessionStorage.setItem("repaymentLoanId", returnedLoanId);
    } else if (queryParams.get("loan_id") && !isRealLoanId(queryParams.get("loan_id"))) {
      sessionStorage.removeItem("repaymentLoanId");
    }
    if (returnedMobile) {
      sessionStorage.setItem("repaymentMobile", returnedMobile);
    }
  }, [
    invalidReturnedLoanId,
    loanIdIsApplicationId,
    navigate,
    rawReturnedLoanId,
    returnedApplicationId,
    returnedLoanId,
    returnedMobile,
  ]);

  const loadApplication = async (showLoader = true) => {
    if (!repaymentLookupId) {
      setLoading(false);
      setError("Application details not found. Please verify your PAN again.");
      return;
    }

    if (showLoader) setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/application/repayment/details/${encodeURIComponent(repaymentLookupId)}`);
      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || "Unable to load repayment details");
        setApplication(null);
        return;
      }

      const nextApplication = result.data || null;
      setApplication(nextApplication);
      if (nextApplication?.application_id) {
        sessionStorage.setItem("repaymentApplicationId", nextApplication.application_id);
      }
      if (nextApplication?.mobile) {
        sessionStorage.setItem("repaymentMobile", nextApplication.mobile);
      }
      if (isRealLoanId(nextApplication?.loan_id)) {
        sessionStorage.setItem("repaymentLoanId", nextApplication.loan_id || "");
      }
    } catch (fetchError) {
      console.error("Repayment details fetch error:", fetchError);
      setError("Server not reachable");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, [repaymentLookupId]);

  const loadPaymentStatus = async (orderId: string) => {
    if (!orderId) return "";

      setPaymentStatus("Checking payment status...");

      try {
        const response = await fetch(`${API_BASE_URL}/application/repayment/payment-status/${orderId}`);
        const result = await readJsonResponse(response);

        if (!response.ok) {
          setPaymentStatus("");
          setError(result.message || "Unable to verify payment status");
          return "";
        }

        const status = String(result.data?.orderStatus || "").toUpperCase();
        const amount = Number(result.data?.orderAmount || 0);

        if (status === "PAID") {
          setError("");
          setPaymentStatus(`Payment successful${amount ? ` for ${formatINR(amount)}` : ""}.`);
          if (String(result.data?.repaymentSync?.repaymentStatus || "").toLowerCase() === "paid") {
            setShowReloanOffer(true);
          }
          await loadApplication(false);
          return status;
        }

        setPaymentStatus(
          status
            ? `Payment status: ${status}. If money was deducted, please wait while Cashfree confirms it.`
            : "Payment status is not available yet."
        );
        return status;
      } catch (fetchError) {
        console.error("Payment status fetch error:", fetchError);
        setPaymentStatus("");
        setError("Server not reachable");
        return "";
      }
  };

  const waitForPaymentStatus = async (orderId: string) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const status = await loadPaymentStatus(orderId);
      if (status === "PAID") return;

      await new Promise((resolve) => window.setTimeout(resolve, 2500));
    }
  };

  useEffect(() => {
    if (!returnedOrderId) return;

    loadPaymentStatus(returnedOrderId);
  }, [returnedOrderId]);

  const repayment = useMemo(() => {
    const loanAmount = Number(application?.principal_amount || application?.loan_amount || 0);
    const safeLoanAmount = Number.isFinite(loanAmount) && loanAmount > 0 ? loanAmount : 0;
    const dueDateValue = application?.repayment_due_date || application?.due_date || "";
    const dueDate = dueDateValue ? new Date(dueDateValue) : null;
    const validDueDate = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;
    const tenureDays = Number(application?.tenure_days || 0);
    const interestAccrued = Number(application?.interest_accrued || 0);
    const totalRepayableAmount = Number(application?.total_repayable_amount || application?.maturity_amount || 0);
    const paidAmount = Number(application?.paid_amount || application?.repayment_paid_amount || 0);
    const isPaid =
      String(application?.status || "").toLowerCase() === "paid" ||
      String(application?.repayment_status || "").toLowerCase() === "paid" ||
      String(application?.payment_status || "").toLowerCase() === "paid";
    const crmOutstandingAmount = Number(application?.next_payment_amount || application?.outstanding_amount || 0);
    const outstandingToday = isPaid
      ? 0
      : Number.isFinite(crmOutstandingAmount) && crmOutstandingAmount > 0
        ? crmOutstandingAmount
        : 0;
    const maturityAmount = isPaid
      ? 0
      : Number.isFinite(totalRepayableAmount) && totalRepayableAmount > 0
        ? totalRepayableAmount
        : 0;
    const payableAmount =
      paymentType === "full"
        ? outstandingToday
        : Number(partAmount || 0);
    const eligibleLimit = safeLoanAmount;

    return {
      loanId: application?.loan_id || application?.application_id || repaymentLookupId || "-",
      customerName: application?.full_name || "Customer",
      loanAmount: safeLoanAmount,
      dueDate: validDueDate,
      tenureDays: Number.isFinite(tenureDays) && tenureDays > 0 ? tenureDays : 0,
      interestRate: application?.interest_rate || "",
      interestAccrued: Number.isFinite(interestAccrued) ? interestAccrued : 0,
      outstandingToday,
      maturityAmount,
      paidAmount: Number.isFinite(Number(paidAmount)) ? Number(paidAmount) : 0,
      eligibleLimit,
      isPaid,
      payableAmount: Number.isFinite(payableAmount) ? payableAmount : 0,
    };
  }, [application, repaymentLookupId, partAmount, paymentType]);

  useEffect(() => {
    if (paymentStatus.toLowerCase().includes("successful") && repayment.isPaid) {
      setShowReloanOffer(true);
    }
  }, [paymentStatus, repayment.isPaid]);

  const detailItems = [
    ["Loan ID", repayment.loanId],
    ["Repayment Due Date", repayment.dueDate ? formatDate(repayment.dueDate) : "-"],
    ["Loan Amount", formatINR(repayment.loanAmount)],
    ["Loan Tenure", repayment.tenureDays > 0 ? `${repayment.tenureDays} days` : "-"],
    ["Interest Rate", repayment.interestRate ? String(repayment.interestRate) : "-"],
    ["Interest Accrued", repayment.interestAccrued > 0 ? formatINR(repayment.interestAccrued) : "-"],
    ["Paid Amount", repayment.paidAmount > 0 ? formatINR(repayment.paidAmount) : "-"],
  ];

  const handlePayment = async () => {
    if (creatingPayment || loading) return;

    if (!repaymentAccessToken) {
      setError("Repayment session expired. Please verify your PAN again.");
      return;
    }

    if (paymentType === "part" && repayment.payableAmount <= 0) {
      setError("Enter a valid part payment amount");
      return;
    }

    if (paymentType === "part" && repayment.payableAmount > repayment.outstandingToday) {
      setError("Part payment amount cannot be more than outstanding amount");
      return;
    }

    setCreatingPayment(true);
    setError("");
    setPaymentStatus("");

    try {
      const response = await fetch(`${API_BASE_URL}/application/repayment/create-payment-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentType,
          ...(paymentType === "part" ? { amount: repayment.payableAmount } : {}),
          repaymentAccessToken,
        }),
      });
      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || "Unable to create payment order");
        return;
      }

      const paymentSessionId = result.data?.paymentSessionId;
      const cashfreeMode = result.data?.cashfreeMode === "sandbox" ? "sandbox" : "production";
      const orderId = result.data?.orderId || "";
      const hasReturnUrl = Boolean(result.data?.hasReturnUrl);

      if (!paymentSessionId) {
        setError("Payment session was not received from Cashfree");
        return;
      }

      await loadCashfreeSdk();

      if (!window.Cashfree) {
        setError("Cashfree checkout is not available");
        return;
      }

      const cashfree = window.Cashfree({ mode: cashfreeMode });
      await cashfree.checkout({
        paymentSessionId,
        redirectTarget: hasReturnUrl ? "_self" : "_modal",
      });

      if (orderId) {
        await waitForPaymentStatus(orderId);
      }
    } catch (fetchError) {
      console.error("Payment create error:", fetchError);
      setError("Unable to start payment. Please try again.");
    } finally {
      setCreatingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5ff] text-slate-950">
      <Navbar />

      <main className="px-4 pb-14 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="overflow-hidden rounded-[28px] border border-purple-100 bg-white shadow-[0_24px_80px_rgba(91,33,182,0.12)]">
            <div className="bg-slate-950 px-5 py-6 text-white sm:px-7 lg:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-purple-100">
                    <ShieldCheck className="h-4 w-4 text-orange-300" />
                    Verified repayment access
                  </div>
                  <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                    Make a Payment
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    Review your live repayment summary and choose a full or part payment option.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                    Outstanding Today
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">
                    {formatINR(repayment.outstandingToday)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7 lg:p-8">
              {error && (
                <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                  {error}
                </div>
              )}

              {paymentStatus && (
                <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                  {paymentStatus}
                </div>
              )}

              {loading ? (
                <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-purple-100 bg-purple-50/50">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-700" />
                    <p className="mt-3 text-sm font-bold text-slate-600">Loading repayment details...</p>
                  </div>
                </div>
              ) : !application ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-red-100 bg-red-50 px-5 text-center">
                  <div>
                    <ShieldCheck className="mx-auto h-9 w-9 text-red-500" />
                    <h2 className="mt-4 text-xl font-black text-slate-950">Repayment Not Available</h2>
                    <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-600">
                      {error || "This loan has not been disbursed yet. Repayment details will appear after disbursal."}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="rounded-3xl border border-purple-100 bg-[#fbfaff] p-5 sm:p-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-purple-700 shadow-sm">
                          <Landmark className="h-6 w-6" />
                        </span>
                        <div>
                          <h2 className="text-xl font-black text-slate-950">Your Loan Details</h2>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {repayment.customerName}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {detailItems.map(([label, value]) => (
                          <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-purple-50">
                            <p className="text-sm font-semibold text-slate-500">{label}</p>
                            <p className="mt-1 break-words text-base font-black text-slate-950">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-3xl bg-gradient-to-br from-purple-600 to-purple-800 p-5 text-white shadow-lg shadow-purple-100">
                        <IndianRupee className="h-7 w-7 text-orange-200" />
                        <p className="mt-4 text-sm font-bold text-purple-100">Outstanding Today</p>
                        <p className="mt-1 text-3xl font-black">{formatINR(repayment.outstandingToday)}</p>
                        <p className="mt-3 text-xs font-semibold leading-5 text-purple-100">
                          Live amount fetched from CRM repayment records.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-orange-100 bg-orange-50 p-5">
                        <p className="text-sm font-bold text-orange-700">Maturity Amount</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{formatINR(repayment.maturityAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7">
                    <h3 className="text-xl font-black text-slate-950">How would you like to pay?</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {[
                        ["full", "Full Payment", formatINR(repayment.outstandingToday), CreditCard],
                        ["part", "Part Payment", "Enter custom amount", IndianRupee],
                      ].map(([type, title, subtitle, Icon]) => (
                        <button
                          key={type as string}
                          type="button"
                          onClick={() => setPaymentType(type as "full" | "part")}
                          className={`flex min-h-[92px] items-center gap-4 rounded-2xl border p-4 text-left transition ${
                            paymentType === type
                              ? "border-purple-500 bg-purple-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-50/40"
                          }`}
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span>
                            <span className="block text-lg font-black text-slate-950">{title as string}</span>
                            <span className="mt-1 block text-sm font-semibold text-slate-500">{subtitle as string}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentType === "part" && (
                    <div className="mt-5">
                      <label className="text-sm font-extrabold text-slate-700">
                        Enter Part Payment Amount
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={repayment.outstandingToday}
                        value={partAmount}
                        onChange={(event) => setPartAmount(event.target.value)}
                        placeholder="Enter amount"
                        className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 text-base font-bold outline-none transition focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
                      />
                    </div>
                  )}

                  <div className="mt-7 rounded-2xl border border-purple-100 bg-purple-50/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-purple-700" />
                        <p className="text-sm font-bold text-slate-700">
                          Payment confirmation will be shared after successful transaction.
                        </p>
                      </div>
                      <p className="text-sm font-black text-slate-950">
                        Payable: {formatINR(repayment.payableAmount)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={creatingPayment || repayment.outstandingToday <= 0 || repayment.payableAmount <= 0}
                    className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-purple-600 text-base font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {creatingPayment ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Opening Checkout
                      </>
                    ) : (
                      <>
                        {repayment.outstandingToday <= 0 ? "No Dues" : `Pay ${paymentType === "full" ? formatINR(repayment.outstandingToday) : "Now"}`}
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>

                  <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    Use only the official payment link. Never transfer to unknown accounts or links.
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </main>

      {showReloanOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-[448px] overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
            <button
              type="button"
              onClick={() => setShowReloanOffer(false)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
              aria-label="Close reloan offer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="bg-slate-950 px-6 pb-6 pt-7 text-white">
              <div className="flex items-center justify-between gap-4 pr-10">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-orange-300 ring-1 ring-white/10">
                  <Sparkles className="h-6 w-6" />
                </span>
                <span className="rounded-full border border-green-300/25 bg-green-300/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-green-200">
                  Paid in full
                </span>
              </div>

              <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Waqt Money
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight">
                Great news!
              </h2>
              <p className="mt-3 text-base font-semibold leading-7 text-slate-200">
                Your repayment is complete. You are pre-qualified for an instant reloan.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                  <WalletCards className="h-5 w-5 text-orange-300" />
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Eligible limit
                  </p>
                  <p className="mt-1 text-xl font-black text-white">Up to {formatLimit(repayment.eligibleLimit)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                  <Clock className="h-5 w-5 text-purple-200" />
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Approval time
                  </p>
                  <p className="mt-1 text-xl font-black text-white">5 min</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-4">
                <p className="text-sm font-bold leading-6 text-slate-700">
                  <span className="text-green-700">Based on your excellent repayment history,</span>{" "}
                  you are eligible for a higher amount with better terms.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { icon: Clock, text: "2-min application" },
                  { icon: ShieldCheck, text: "100% secure" },
                  { icon: FileText, text: "Minimal docs" },
                  { icon: TrendingUp, text: "Better terms" },
                ].map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.text}
                      className="flex min-h-[66px] items-center gap-3 rounded-2xl border border-purple-100 bg-[#fbfaff] px-3 py-2"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm">
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="text-sm font-black leading-tight text-slate-700">
                        {feature.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-[1.45fr_1fr] gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/user/apply")}
                  className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8048e2] to-[#bd56e4] px-4 text-sm font-black text-white shadow-lg shadow-purple-100 transition hover:opacity-95"
                >
                  Apply for Reloan
                  <TrendingUp className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowReloanOffer(false)}
                  className="flex min-h-[54px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Maybe Later
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl bg-slate-50 px-3 py-3 text-[11px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-green-600" />
                  256-bit encryption
                </span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  Instant approval
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MakePayment;
