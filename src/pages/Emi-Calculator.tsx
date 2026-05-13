import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  AlertTriangle,
  Calculator,
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  Percent,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";

const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function EmiCalculator() {
  const [amount, setAmount] = useState(20000);
  const [tenure, setTenure] = useState(30);
  const [rate, setRate] = useState(1);

  const interest = useMemo(
    () => Math.round((amount * rate * tenure) / 100),
    [amount, rate, tenure]
  );

  const totalPayable = amount + interest;
  const apr = rate * 365;

  // ✅ Dynamic Pie Chart
  const interestPercent =
    totalPayable > 0 ? (interest / totalPayable) * 100 : 0;

  const amountPercent = 100 - interestPercent;

  const chartBg = `conic-gradient(
    #6d28d9 0% ${amountPercent}%,
    #f59e0b ${amountPercent}% 100%
  )`;

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc,#eef2ff_48%,#fff7ed)] pt-24">
        <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-orange-400 text-white shadow-lg shadow-purple-200">
                <Calculator size={26} />
              </div>

              <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl md:text-5xl">
                EMI <span className="text-purple-600">Calculator</span>
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Plan your Waqt Money salary loan with a simple estimate of
                interest, APR, and total repayment before applying.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="rounded-2xl border border-purple-100 bg-white p-4 shadow-xl shadow-purple-100/70 sm:p-6 lg:p-8">
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Loan Amount */}
                  <InputCard
                    icon={<IndianRupee size={18} />}
                    title="Loan Amount"
                    value={formatINR(amount)}
                    tone="purple"
                  >
                    <input
                      type="range"
                      min={5000}
                      max={200000}
                      step={1000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full accent-purple-600"
                    />

                    <input
                      type="number"
                      min={5000}
                      max={200000}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="mt-3 h-11 w-full rounded-lg border border-purple-100 bg-purple-50/50 px-3 text-center text-sm font-semibold text-slate-900 outline-none transition focus:border-purple-500 focus:bg-white"
                    />
                  </InputCard>

                  {/* Tenure */}
                  <InputCard
                    icon={<CalendarDays size={18} />}
                    title="Tenure"
                    value={`${tenure} Days`}
                    tone="purple"
                  >
                    <input
                      type="range"
                      min={7}
                      max={45}
                      value={tenure}
                      onChange={(e) => setTenure(Number(e.target.value))}
                      className="w-full accent-purple-600"
                    />

                    <input
                      type="number"
                      min={7}
                      max={45}
                      value={tenure}
                      onChange={(e) => setTenure(Number(e.target.value))}
                      className="mt-3 h-11 w-full rounded-lg border border-purple-100 bg-purple-50/50 px-3 text-center text-sm font-semibold text-slate-900 outline-none transition focus:border-purple-500 focus:bg-white"
                    />
                  </InputCard>

                  {/* Interest Rate */}
                  <InputCard
                    icon={<Percent size={18} />}
                    title="Interest Rate"
                    value={`${rate}% / day`}
                    tone="purple"
                  >
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="w-full accent-purple-600"
                    />

                    <input
                      type="number"
                      min={1}
                      max={3}
                      step={0.1}
                      value={rate}
                      onChange={(e) => setRate(Number(e.target.value))}
                      className="mt-3 h-11 w-full rounded-lg border border-purple-100 bg-purple-50/50 px-3 text-center text-sm font-semibold text-slate-900 outline-none transition focus:border-purple-500 focus:bg-white"
                    />
                  </InputCard>
                </div>

                {/* Chart Section */}
                <div className="mt-6 grid gap-6 rounded-2xl border border-purple-100 bg-[linear-gradient(135deg,#f5f3ff,#fff7ed)] p-4 sm:p-5 md:grid-cols-[270px_1fr]">
                  <div className="flex min-w-0 flex-col items-center justify-center gap-4">
                    <div
                      className="relative flex aspect-square w-full max-w-[188px] items-center justify-center rounded-full p-4 transition-all duration-500 sm:max-w-[208px]"
                      style={{
                        background: chartBg,
                        boxShadow:
                          "inset 0 8px 22px rgba(15,23,42,0.08), 0 16px 36px rgba(124,58,237,0.14)",
                      }}
                    >
                      <div className="flex h-[70%] w-[70%] min-w-0 flex-col items-center justify-center rounded-full bg-white px-2 text-center shadow-lg">
                        <p className="w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold leading-tight text-slate-950 sm:text-lg md:text-xl">
                          {formatINR(totalPayable)}
                        </p>

                        <p className="mt-1 px-1 text-[11px] font-medium leading-tight text-slate-500 sm:text-xs">
                          Total Payable
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 shadow-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-purple-600" />
                        Loan
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-amber-500" />
                        Interest
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-white bg-white/90 p-4 shadow-sm sm:p-5">
                    <Summary label="Loan Amount" value={formatINR(amount)} />

                    <Summary label="Tenure" value={`${tenure} Days`} />

                    <Summary
                      label="Interest Amount"
                      value={formatINR(interest)}
                    />

                    <Summary label="APR" value={`${apr.toFixed(1)}%`} />

                    <div className="mt-4 rounded-xl bg-gradient-to-r from-purple-600 to-orange-400 p-5 text-white shadow-lg shadow-orange-100">
                      <p className="text-sm font-medium text-white/85">
                        Total Repayment
                      </p>

                      <p className="mt-1 break-words text-2xl font-bold sm:text-3xl">
                        {formatINR(totalPayable)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  to="/user/apply"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700"
                >
                  Apply Now
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-xl shadow-orange-100/60">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                      <ShieldCheck className="h-5 w-5" />
                    </span>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                        Transparent Estimate
                      </p>

                      <h2 className="text-xl font-bold text-slate-950">
                        Rates & Charges
                      </h2>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {[
                      `Loan Amount: ${formatINR(
                        5000
                      )} to ${formatINR(200000)}`,
                      "Tenure: 7 to 45 Days",
                      "Fast approval process",
                      "No hidden charges",
                      "Flexible repayment options",
                      "Minimum salary eligibility applies",
                    ].map((item) => (
                      <div key={item} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />

                        <p className="text-sm leading-6 text-slate-600">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-orange-400 p-6 text-white shadow-xl shadow-purple-200">
                  <p className="text-sm font-medium text-white/85">
                    Quick Personal Loan
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    Money in Minutes.
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-white/90">
                    Apply online with Waqt Money and get fast loan approval with
                    a simple digital process.
                  </p>
                </div>
              </aside>
            </div>

            <div className="mt-8 rounded-2xl border border-purple-100 bg-white/90 p-5 text-left shadow-lg shadow-purple-100/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500">
                  <AlertTriangle className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-950">
                    Disclaimer
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The loan calculator is provided solely for illustrative and informational purposes. The results are based on the inputs provided and may not reflect actual loan terms or approval outcomes. Waqt Money makes no guarantees as to the accuracy, completeness, or suitability of the results. Loan approval, terms, and conditions are at the sole discretion of Waqt Money and are subject to change without notice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function InputCard({
  icon,
  title,
  value,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  tone: "purple" | "orange";
  children: React.ReactNode;
}) {
  const isPurple = tone === "purple";

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white ${isPurple ? "bg-purple-600" : "bg-orange-500"
          }`}
      >
        {icon}
      </div>

      <p className="text-sm font-medium text-slate-500">{title}</p>

      <p
        className={`mb-4 mt-1 text-xl font-bold ${isPurple ? "text-purple-600" : "text-orange-500"
          }`}
      >
        {value}
      </p>

      {children}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 text-sm">
      <span className="text-slate-500">{label}</span>

      <span className="font-bold text-slate-950">{value}</span>
    </div>
  );
}
