import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  IndianRupee,
  Landmark,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";
const DAILY_INTEREST_RATE = 0.9;
const DEFAULT_TENURE_DAYS = 32;
const DEFAULT_LOAN_AMOUNT = 35100;
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
  loan_amount?: number | string;
  loan_purpose?: string;
  full_name?: string;
  mobile?: string;
  pan_number?: string;
  submit_at?: string;
  last_activity_at?: string;
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

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const daysBetween = (start: Date, end: Date) => {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const getStoredRepaymentApplicationId = () =>
  sessionStorage.getItem("repaymentApplicationId") ||
  sessionStorage.getItem("applicationId") ||
  localStorage.getItem("applicationId") ||
  "";

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

  const queryParams = new URLSearchParams(window.location.search);
  const returnedOrderId = queryParams.get("order_id") || "";
  const returnedApplicationId = queryParams.get("application_id") || "";
  const applicationId = returnedApplicationId || getStoredRepaymentApplicationId();
  const repaymentAccessToken = getStoredRepaymentAccessToken();

  useEffect(() => {
    if (returnedApplicationId) {
      sessionStorage.setItem("repaymentApplicationId", returnedApplicationId);
    }
  }, [returnedApplicationId]);

  useEffect(() => {
    if (!applicationId) {
      setLoading(false);
      setError("Application details not found. Please verify your PAN again.");
      return;
    }

    const loadApplication = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/application/${applicationId}`);
        const result = await readJsonResponse(response);

        if (!response.ok) {
          setError(result.message || "Unable to load repayment details");
          return;
        }

        setApplication(result.data || null);
      } catch (fetchError) {
        console.error("Repayment details fetch error:", fetchError);
        setError("Server not reachable");
      } finally {
        setLoading(false);
      }
    };

    loadApplication();
  }, [applicationId]);

  const loadPaymentStatus = async (orderId: string) => {
    if (!orderId) return;

      setPaymentStatus("Checking payment status...");

      try {
        const response = await fetch(`${API_BASE_URL}/application/repayment/payment-status/${orderId}`);
        const result = await readJsonResponse(response);

        if (!response.ok) {
          setPaymentStatus("");
          setError(result.message || "Unable to verify payment status");
          return;
        }

        const status = String(result.data?.orderStatus || "").toUpperCase();
        const amount = Number(result.data?.orderAmount || 0);

        if (status === "PAID") {
          setPaymentStatus(`Payment successful${amount ? ` for ${formatINR(amount)}` : ""}.`);
          return;
        }

        setPaymentStatus(
          status
            ? `Payment status: ${status}. If money was deducted, please wait while Cashfree confirms it.`
            : "Payment status is not available yet."
        );
      } catch (fetchError) {
        console.error("Payment status fetch error:", fetchError);
        setPaymentStatus("");
        setError("Server not reachable");
      }
  };

  useEffect(() => {
    if (!returnedOrderId) return;

    loadPaymentStatus(returnedOrderId);
  }, [returnedOrderId]);

  const repayment = useMemo(() => {
    const loanAmount = Number(application?.loan_amount || DEFAULT_LOAN_AMOUNT);
    const safeLoanAmount = Number.isFinite(loanAmount) && loanAmount > 0 ? loanAmount : DEFAULT_LOAN_AMOUNT;
    const startDate = application?.submit_at ? new Date(application.submit_at) : new Date();
    const validStartDate = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
    const dueDate = addDays(validStartDate, DEFAULT_TENURE_DAYS);
    const elapsedDays = Math.min(DEFAULT_TENURE_DAYS, Math.max(1, daysBetween(validStartDate, new Date())));
    const interestAccrued = Number(((safeLoanAmount * DAILY_INTEREST_RATE * elapsedDays) / 100).toFixed(2));
    const maturityInterest = Number(((safeLoanAmount * DAILY_INTEREST_RATE * DEFAULT_TENURE_DAYS) / 100).toFixed(2));
    const outstandingToday = Number((safeLoanAmount + interestAccrued).toFixed(2));
    const maturityAmount = Number((safeLoanAmount + maturityInterest).toFixed(2));
    const payableAmount =
      paymentType === "full"
        ? outstandingToday
        : Number(partAmount || 0);

    return {
      loanId: application?.application_id || applicationId || "-",
      customerName: application?.full_name || "Customer",
      loanAmount: safeLoanAmount,
      dueDate,
      tenureDays: DEFAULT_TENURE_DAYS,
      elapsedDays,
      interestAccrued,
      outstandingToday,
      maturityAmount,
      payableAmount: Number.isFinite(payableAmount) ? payableAmount : 0,
    };
  }, [application, applicationId, partAmount, paymentType]);

  const detailItems = [
    ["Loan ID", repayment.loanId],
    ["Repayment Due Date", formatDate(repayment.dueDate)],
    ["Loan Amount", formatINR(repayment.loanAmount)],
    ["Loan Tenure", `${repayment.tenureDays} days`],
    ["Interest Rate", `${DAILY_INTEREST_RATE}% per day`],
    ["Interest Accrued", formatINR(repayment.interestAccrued)],
  ];

  const handlePayment = async () => {
    if (creatingPayment || loading) return;

    if (!applicationId) {
      setError("Application details not found. Please verify your PAN again.");
      return;
    }

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
          applicationId,
          amount: repayment.payableAmount,
          paymentType,
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

      if (cashfreeMode === "production" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        setError(
          "Cashfree production checkout is available only on the approved live domain."
        );
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
        await loadPaymentStatus(orderId);
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
                          Calculated using {repayment.elapsedDays} active day(s) of interest.
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
                    disabled={creatingPayment || (paymentType === "part" && repayment.payableAmount <= 0)}
                    className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-purple-600 text-base font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {creatingPayment ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Opening Checkout
                      </>
                    ) : (
                      <>
                        Pay {paymentType === "full" ? formatINR(repayment.outstandingToday) : "Now"}
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>

                  {paymentStatus.toLowerCase().includes("successful") && (
                    <button
                      type="button"
                      onClick={() => navigate("/repayment/reloan-offer")}
                      className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-green-200 bg-white text-sm font-black text-green-700 transition hover:bg-green-50"
                    >
                      Continue
                    </button>
                  )}

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

      <Footer />
    </div>
  );
};

export default MakePayment;
