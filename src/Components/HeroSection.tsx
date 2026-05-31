import { useState } from "react";
import { ArrowRight, Shield, Clock, CheckCircle2, PhoneCall, X } from "lucide-react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";

const stats = [
  { value: "4.9/5", label: "Average Rating" },
  { value: "50K+", label: "Happy Customers" },
  { value: "\u20b9100Cr+", label: "Loans Disbursed" },
  { value: "99.2%", label: "Satisfaction Rate" },
];

const HeroSection = () => {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedMobile, setSubmittedMobile] = useState("");

  const digitsOnly = (value: string) => value.replace(/\D/g, "");

  const readJsonResponse = async (res: Response) => {
    const text = await res.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { message: "Server returned an invalid response" };
    }
  };

  const handleLeadSubmit = async () => {
    if (loading) return;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/application/lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
        }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || "Unable to submit your request");
        return;
      }

      setSubmittedMobile(mobile);
      setSubmitted(true);
      setMobile("");
    } catch (submitError) {
      console.error("Hero lead submit error:", submitError);
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-hero pb-10 pt-24 lg:pb-12 lg:pt-24 xl:pb-16 xl:pt-[20px]">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid items-center gap-8 lg:gap-10 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-12">
          <div className="animate-fade-up text-center xl:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary sm:mb-6">
              <Shield className="w-4 h-4" />
              RBI Registered NBFC
            </div>
            <h1 className="mx-auto mb-4 max-w-2xl font-heading text-4xl font-extrabold leading-tight text-foreground md:text-5xl lg:text-6xl xl:mx-0">
              Fast Approvals{" "}
              <span className="text-gradient">Money in Minutes.</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg xl:mx-0 xl:max-w-lg">
              Instant personal loans with zero paperwork, no hidden charges. Apply in 2 minutes. Funds disbursed within 5 minutes.
            </p>
            <div className="mx-auto mb-3 flex w-full max-w-md flex-col items-stretch gap-2 transition-all sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:border sm:border-gray-200 sm:bg-white sm:p-2 sm:shadow-md sm:hover:shadow-lg xl:mx-0">

              {/* Input */}
              <input
                type="text"
                inputMode="numeric"
                value={mobile}
                onChange={(event) => {
                  setMobile(digitsOnly(event.target.value).slice(0, 10));
                  setError("");
                }}
                placeholder="Enter your mobile number"
                className="hidden min-w-0 flex-1 bg-transparent px-5 py-3 text-sm text-gray-700 outline-none placeholder-black sm:block"
              />

              {/* Button */}
              <button
                type="button"
                onClick={handleLeadSubmit}
                disabled={loading}
                className="hidden w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3 font-semibold text-white transition-all hover:scale-105 disabled:opacity-60 sm:flex sm:w-auto sm:rounded-full"
              >
                {loading ? "Submitting..." : "Apply Now"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <Link
                to="/user/apply"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3 font-semibold text-white transition-all hover:scale-105 sm:hidden"
              >
                Apply Now
                <ArrowRight className="w-4 h-4" />
              </Link>

            </div>
            {error && (
              <p className="mx-auto mb-5 hidden max-w-md rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 sm:block xl:mx-0">
                {error}
              </p>
            )}
            <div className="mx-auto mt-7 grid w-full max-w-xl gap-5 sm:grid-cols-2 xl:mx-0">
              {[
                {
                  title: "Funds in Minutes*",
                  description: "Quick disbursals",
                },
                {
                  title: "Money When You Need It",
                  description: "Fast approvals, quick transfers",
                },
                {
                  title: "Instant Payday Support",
                  description: "No delays, just funds",
                },
                {
                  title: "Get Paid Faster",
                  description: "Hassle-free quick credit",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                    <Clock className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-base font-bold leading-5 text-slate-950">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative w-full justify-self-center animate-slide-right xl:max-w-none">
            <div className="mx-auto w-full max-w-[315px] rounded-3xl bg-white/80 p-2 shadow-lg sm:max-w-md sm:bg-transparent sm:p-0 sm:shadow-none md:max-w-lg lg:max-w-[520px] xl:max-w-2xl">
              <div className="relative w-full">
                <div className="absolute -inset-3 rounded-3xl bg-primary/5 blur-3xl sm:-inset-4" />
                <img
                  src="/landing_banner_img.png"
                  alt="Happy customer"
                  width={700}
                  height={700}
                  loading="eager"
                  decoding="async"
                  className="relative mx-auto aspect-[5/4] w-full rounded-3xl object-contain object-bottom shadow-elevated sm:aspect-square xl:max-w-2xl"
                />
                <div
                  className="absolute right-3 top-28 hidden rounded-2xl bg-card p-3 shadow-2xl animate-fade-in sm:right-4 sm:top-32 sm:p-4 xl:right-5 xl:top-36 xl:block"
                  style={{ animationDelay: "0.3s" }}
                >
                  <p className="font-heading text-xl font-bold text-foreground sm:text-2xl">{"\u20b9"}1Cr+</p>
                  <p className="text-xs text-muted-foreground">Loans Disbursed</p>
                </div>
                <div className="absolute bottom-4 left-3 hidden rounded-2xl bg-primary p-3 text-primary-foreground shadow-glow animate-fade-in sm:bottom-8 sm:p-4 xl:left-5 xl:block" style={{ animationDelay: "0.5s" }}>
                  <p className="text-xs font-semibold sm:text-sm">Get Approved Fast.</p>
                  <p className="text-sm font-bold sm:text-base">Get Funded Faster.</p>
                </div>
              </div>
              <div className="mt-3 grid w-full grid-cols-1 md:grid-cols-2 gap-3 xl:hidden">
                <div className="rounded-2xl bg-card px-4 py-3 text-center shadow-lg">
                  <p className="font-heading text-lg font-bold text-foreground">{"\u20b9"}1Cr+</p>
                  <p className="text-[11px] text-muted-foreground">Loans Disbursed</p>
                </div>

                <div className="rounded-2xl bg-primary px-4 py-3 text-center text-primary-foreground shadow-glow">
                  <p className="text-xs font-semibold">Get Approved Fast.</p>
                  <p className="text-sm font-bold">Get Funded Faster.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-12 border-t border-border">
          {stats.map((stat, i) => (
            <div key={stat.label} className="text-center animate-count" style={{ animationDelay: `${i * 0.1}s` }}>
              <p className="font-heading text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div> */}
      </div>
      {submitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-white/20">
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Close thank you popup"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 px-8 pb-10 pt-9 text-center text-white">
              <div className="absolute left-6 top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-4 right-8 h-16 w-16 rounded-full bg-white/10 blur-xl" />
              <div className="relative mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-white/20">
                Waqt Money
              </div>
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-8 ring-white/10">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h2 className="relative font-heading text-3xl font-extrabold">Thank You!</h2>
              <p className="mt-2 text-sm font-medium text-white/90">
                Your Waqt Money loan request has been received successfully.
              </p>
            </div>

            <div className="-mt-8 px-6 pb-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-lg">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 ring-8 ring-green-50/70">
                  <PhoneCall className="h-6  w-6" />
                </div>
                <p className="text-base font-bold text-slate-900">Waqt Money team will contact you shortly</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  We have saved your mobile number
                  {submittedMobile ? <span className="font-semibold text-slate-900"> {submittedMobile}</span> : null}
                  . Please keep your phone reachable.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Status</p>
                    <p className="mt-1 text-sm font-bold text-green-600">Request received</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Next step</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">Callback soon</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-5 w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-purple-200 transition hover:scale-[1.02]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
