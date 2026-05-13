import { CheckCircle2, Clock, FileText, IndianRupee, Lock, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";

const features = [
  { icon: Clock, text: "2-min application" },
  { icon: ShieldCheck, text: "100% secure" },
  { icon: FileText, text: "Minimal docs" },
  { icon: TrendingUp, text: "Better rates" },
];

const ReloanOffer = () => {
  return (
    <div className="min-h-screen bg-[#f7f5ff] text-slate-950">
      <Navbar />

      <main className="px-4 pb-14 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
          <div className="relative flex min-h-[520px] flex-col justify-between overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:p-8">
            <div className="absolute right-[-70px] top-[-70px] h-56 w-56 rounded-full bg-purple-500/20" />
            <div className="absolute bottom-[-80px] left-[-80px] h-56 w-56 rounded-full bg-orange-400/10" />

            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-orange-300 ring-1 ring-white/10">
                  <Sparkles className="h-7 w-7" />
                </div>
                <span className="rounded-full border border-green-300/20 bg-green-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-green-200">
                  Pre-qualified
                </span>
              </div>

              <h1 className="mt-8 max-w-sm text-4xl font-black leading-tight sm:text-5xl">
                Great News!
              </h1>
              <p className="mt-3 max-w-md text-lg font-semibold leading-8 text-slate-200 sm:text-xl">
                You're pre-qualified for an instant reloan.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
                  <IndianRupee className="h-5 w-5 text-orange-300" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Eligible limit
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">₹75,000</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
                  <Clock className="h-5 w-5 text-purple-200" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Approval time
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">5 min</p>
                </div>
              </div>
            </div>

            <div className="relative mt-8 rounded-3xl border border-white/10 bg-white/[0.07] p-5">
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-300/15 text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold leading-6 text-slate-200">
                  <span className="font-black text-green-300">
                    Excellent repayment history confirmed.
                  </span>{" "}
                  Get a higher amount with a faster application and improved terms.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-purple-100 bg-white p-5 shadow-[0_24px_80px_rgba(91,33,182,0.13)] sm:p-7 lg:p-8">
            <div className="rounded-3xl bg-gradient-to-br from-purple-50 to-orange-50 p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-700">
                    Reloan offer
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-slate-950">
                    Faster funds. Better terms.
                  </h2>
                </div>
                <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">Eligible limit up to</p>
                  <p className="mt-1 text-2xl font-black text-purple-700">₹75,000</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.text}
                    className="flex min-h-[78px] items-center gap-4 rounded-2xl border border-purple-100 bg-[#fbfaff] p-4"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-purple-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="text-base font-black leading-tight text-slate-700">
                      {feature.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-[1.45fr_1fr]">
              <Link
                to="/user/apply"
                className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-orange-400 px-5 text-base font-black text-slate-950 shadow-lg shadow-orange-100 transition hover:bg-orange-500"
              >
                Apply for Reloan
                <TrendingUp className="h-5 w-5" />
              </Link>

              <Link
                to="/"
                className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-base font-black text-slate-600 transition hover:bg-slate-50"
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
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ReloanOffer;
