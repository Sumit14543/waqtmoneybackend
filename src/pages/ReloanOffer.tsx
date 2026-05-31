import { Clock, FileText, Lock, ShieldCheck, Sparkles, TrendingUp, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const getLastLoanAmount = () => {
  const amount = Number(
    sessionStorage.getItem("lastLoanAmount") ||
      localStorage.getItem("lastLoanAmount") ||
      0
  );

  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const formatLimit = (value: number) => formatINR(value).replace("₹", "Rs ");

const features = [
  { icon: Clock, text: "2-min application" },
  { icon: ShieldCheck, text: "100% secure" },
  { icon: FileText, text: "Minimal documents" },
  { icon: TrendingUp, text: "Better terms" },
];

const ReloanOffer = () => {
  const eligibleLimit = getLastLoanAmount();

  return (
    <div className="min-h-screen bg-[#f7f5ff] text-slate-950">
      <Navbar />

      <main className="px-4 pb-14 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-[1120px] overflow-hidden rounded-[28px] border border-purple-100 bg-white shadow-[0_24px_80px_rgba(91,33,182,0.13)]">
          <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
            <div className="flex min-h-[540px] flex-col justify-between bg-slate-950 px-6 py-8 text-white sm:px-8 lg:px-10">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-orange-300 ring-1 ring-white/10">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <span className="rounded-full border border-green-300/25 bg-green-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-green-200">
                    Paid in full
                  </span>
                </div>

                <p className="mt-8 text-sm font-black uppercase tracking-[0.24em] text-orange-300">
                  Waqt Money
                </p>
                <h1 className="mt-3 max-w-md text-4xl font-black leading-tight sm:text-5xl">
                  Great news!
                </h1>
                <p className="mt-4 max-w-md text-lg font-semibold leading-8 text-slate-200 sm:text-xl">
                  Your repayment is complete. You are pre-qualified for an instant reloan with Waqt Money.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                  <WalletCards className="h-5 w-5 text-orange-300" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Eligible limit
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {eligibleLimit > 0 ? `Up to ${formatLimit(eligibleLimit)}` : "Based on last loan"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                  <Clock className="h-5 w-5 text-purple-200" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Approval time
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">5 min</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-8 sm:px-8 lg:px-10">
              <div className="rounded-2xl border border-green-100 bg-green-50 px-5 py-5">
                <p className="text-base font-bold leading-7 text-slate-700 sm:text-lg">
                  <span className="text-green-700">Based on your excellent repayment history,</span>{" "}
                  you are eligible for a higher loan amount with faster processing and better terms.
                </p>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {features.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.text}
                      className="flex min-h-[76px] items-center gap-4 rounded-2xl border border-purple-100 bg-[#fbfaff] px-4 py-3"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </span>
                      <p className="text-base font-black leading-tight text-slate-700">
                        {feature.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
                <Link
                  to="/user/apply"
                  className="flex min-h-[62px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#8048e2] to-[#bd56e4] px-5 text-base font-black text-white shadow-lg shadow-purple-100 transition hover:opacity-95"
                >
                  Apply for Reloan
                  <TrendingUp className="h-5 w-5" />
                </Link>

                <Link
                  to="/user/dashboard"
                  className="flex min-h-[62px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-base font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Maybe Later
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-green-600" />
                  256-bit encryption
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  Instant approval
                </span>
                <span>10k+ happy customers</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ReloanOffer;
