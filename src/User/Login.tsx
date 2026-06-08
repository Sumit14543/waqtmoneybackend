import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  CreditCard,
  DollarSign,
  IndianRupee,
  LogIn,
  Phone,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { API_BASE_URL } from "@/config/api";

const OTP_LENGTH = 6;

const Login = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [otpSent, setOtpSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = window.setTimeout(() => {
      setSecondsLeft((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const readJsonResponse = async (res: Response) => {
    const text = await res.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { message: "Server returned an invalid response" };
    }
  };

  const normalizeMobileInput = (value: string) => value.replace(/\D/g, "").slice(-10);

  const sendOtp = async (isResend = false) => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    if (loading || resending) return;

    if (isResend) {
      setResending(true);
    } else {
      setLoading(true);
    }
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-login-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        const details = Array.isArray(result.details) ? result.details.join(" ") : "";
        setError(details || result.message || "Unable to send OTP");
        return;
      }

      setOtp(Array(OTP_LENGTH).fill(""));
      setOtpSent(true);
      setSecondsLeft(Number(result.data?.ttl || 60));
      setMessage(isResend ? "OTP resent successfully" : "OTP sent successfully");
      window.setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (fetchError) {
      console.error("Login OTP send error:", fetchError);
      setError("Server not reachable");
    } finally {
      setLoading(false);
      setResending(false);
    }
  };

  const handleSendOtp = (event: FormEvent) => {
    event.preventDefault();
    void sendOtp(false);
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const nextOtp = [...otp];
    nextOtp[index] = value.slice(-1);
    setOtp(nextOtp);
    setError("");
    setMessage("");

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedOtp = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH)
      .split("");

    if (!pastedOtp.length) return;

    const nextOtp = Array(OTP_LENGTH).fill("");
    pastedOtp.forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);
    inputsRef.current[Math.min(pastedOtp.length, OTP_LENGTH) - 1]?.focus();
  };

  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();

    if (loading) return;

    const enteredOtp = otp.join("");
    if (enteredOtp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-login-otp`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp: enteredOtp }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || result.error || "OTP verification failed");
        return;
      }

      sessionStorage.setItem("authUser", JSON.stringify(result.user || {}));
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      navigate("/user/dashboard");
    } catch (fetchError) {
      console.error("Login OTP verify error:", fetchError);
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  const timerText = `00:${String(secondsLeft).padStart(2, "0")}`;

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,#f3e8ff_0,#f8f6ff_32%,#ffffff_100%)] pt-16 sm:pt-20">
      <Navbar />

      <div className="flex flex-1 items-center justify-center px-2.5 py-3 sm:px-4 sm:py-8">
        <div className="flex min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-purple-100 bg-white shadow-[0_24px_70px_rgba(91,33,182,0.16)] sm:rounded-[26px] md:min-h-[580px] md:flex-row">
          <div className="relative flex w-full flex-col overflow-hidden bg-[#070a18] p-3.5 text-white sm:p-7 md:w-1/2">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />

            <div className="relative z-10 flex items-center gap-3 md:block">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-orange-300 ring-1 ring-white/10 sm:h-11 sm:w-11 md:mb-4 md:h-12 md:w-12">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
              </span>
              <div>
                <h1 className="text-[22px] font-black leading-tight sm:text-3xl md:text-4xl">Waqt Money</h1>
                <p className="mt-1 max-w-sm text-[11px] font-semibold leading-4 text-slate-300 sm:text-sm sm:leading-5 md:mt-2 md:text-base md:leading-6">
                  Securely access your loan dashboard, repayments, and application journey.
                </p>
              </div>
            </div>

            <div className="relative z-10 mx-auto mb-3 mt-1 w-full max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-2 shadow-2xl shadow-purple-950/30 sm:my-4 sm:max-w-none sm:rounded-3xl sm:p-3 md:my-5">
              <img
                src="/login-finance-hero.png"
                alt="Waqt Money secure finance access"
                className="h-40 w-full rounded-xl object-cover object-left sm:h-52 sm:rounded-2xl md:h-48 lg:h-56"
              />
              <div className="pointer-events-none absolute inset-y-5 right-4 w-14 sm:inset-y-6 sm:right-6 sm:w-24">
                <span className="absolute right-2 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-orange-300/25 bg-[#231743]/55 text-orange-300 shadow-[0_0_24px_rgba(249,115,22,0.22)] backdrop-blur sm:right-3 sm:h-9 sm:w-9">
                  <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="absolute right-0 top-12 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/25 bg-[#18294a]/50 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.18)] backdrop-blur sm:top-16 sm:h-9 sm:w-9">
                  <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="absolute right-3 top-24 flex h-7 w-7 items-center justify-center rounded-full border border-purple-200/25 bg-[#24173f]/55 text-purple-100 shadow-[0_0_24px_rgba(168,85,247,0.2)] backdrop-blur sm:right-5 sm:top-32 sm:h-9 sm:w-9">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
              </div>
            </div>

            <div className="relative z-10 mt-4 hidden grid-cols-3 gap-2.5 sm:grid md:mt-0">
              {[
                { label: "OTP login", icon: BadgeCheck },
                { label: "Loan status", icon: CreditCard },
                { label: "Repayment", icon: IndianRupee },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-2.5">
                  <Icon className="h-4 w-4 text-orange-300" />
                  <p className="mt-1.5 text-[11px] font-black leading-4 text-slate-200 sm:text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-[360px] w-full flex-col justify-center overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#fbf7ff_48%,#fff7ed_100%)] p-4 sm:min-h-[520px] sm:p-7 md:min-h-0 md:w-1/2 lg:p-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="login-finance-grid absolute inset-0 opacity-40" />
              <div className="absolute -right-20 -top-16 h-56 w-56 rounded-full bg-purple-200/45 blur-3xl" />
              <div className="absolute -bottom-20 -left-16 h-60 w-60 rounded-full bg-orange-100/80 blur-3xl" />

              <div className="absolute bottom-7 left-7 hidden h-10 w-10 items-center justify-center rounded-2xl bg-white/65 text-orange-500/80 shadow-[0_14px_30px_rgba(249,115,22,0.12)] ring-1 ring-orange-100/80 backdrop-blur sm:flex">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div className="absolute bottom-8 right-8 hidden h-10 w-10 items-center justify-center rounded-2xl bg-white/65 text-emerald-500/80 shadow-[0_14px_30px_rgba(16,185,129,0.12)] ring-1 ring-emerald-100/80 backdrop-blur sm:bottom-10 sm:right-10 sm:flex">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="absolute bottom-20 left-1/2 hidden h-9 w-9 -translate-x-1/2 items-center justify-center rounded-2xl bg-white/60 text-purple-500/75 shadow-[0_14px_30px_rgba(126,34,206,0.12)] ring-1 ring-purple-100/80 backdrop-blur sm:flex">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>

            <div className="relative z-10 mx-auto w-full max-w-[430px] -translate-y-2 py-7 sm:-translate-y-6 sm:py-14 md:-translate-y-8 md:py-0">
              <div className="mb-4 text-center sm:mb-7">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-purple-700 shadow-[0_14px_30px_rgba(126,34,206,0.12)] ring-1 ring-purple-100 sm:mb-4 sm:h-12 sm:w-12">
                  <LogIn className="h-5 w-5" />
                </span>
                <h2 className="text-[22px] font-black leading-tight text-slate-950 sm:text-[28px]">
                  {otpSent ? "Verify OTP" : "Login with Mobile"}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500 sm:text-base">
                  {otpSent ? `Enter the 6-digit OTP sent to ${mobile}` : "Enter your mobile number to continue."}
                </p>
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="flex flex-col justify-center">
                  <div className="relative mb-4">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={mobile}
                      onChange={(event) => setMobile(normalizeMobileInput(event.target.value))}
                      placeholder="Mobile Number"
                    className="h-14 w-full rounded-2xl border border-purple-100/90 bg-white/90 p-3 pl-12 text-base font-bold text-slate-900 shadow-[0_16px_34px_rgba(126,34,206,0.08)] outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 sm:h-16"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 font-black text-white shadow-[0_18px_32px_rgba(126,34,206,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(126,34,206,0.34)] disabled:translate-y-0 disabled:opacity-60 sm:h-16"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                    {!loading && <ArrowRight className="h-5 w-5" />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col justify-center">
                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2 md:gap-3">
                    {otp.map((value, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          if (el) inputsRef.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={value}
                        onChange={(event) => handleOtpChange(event.target.value, index)}
                        onKeyDown={(event) => handleOtpKeyDown(event, index)}
                        onPaste={handleOtpPaste}
                        className="h-12 min-w-0 rounded-xl border-2 border-purple-100 bg-white/95 text-center text-lg font-black text-slate-950 shadow-[0_12px_24px_rgba(126,34,206,0.08)] outline-none transition focus:border-purple-600 focus:bg-purple-50 sm:h-14 sm:text-xl"
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-sm font-bold">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-purple-700 shadow-sm ring-1 ring-purple-100">
                      <Clock className="h-4 w-4" />
                      {timerText}
                    </span>
                    <button
                      type="button"
                      onClick={() => void sendOtp(true)}
                      disabled={resending || secondsLeft > 0}
                      className="text-purple-700 transition hover:text-purple-900 disabled:text-slate-400"
                    >
                      {resending ? "Sending..." : "Resend OTP"}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 font-black text-white shadow-[0_18px_32px_rgba(126,34,206,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(126,34,206,0.34)] disabled:translate-y-0 disabled:opacity-60 sm:h-16"
                  >
                    {loading ? "Verifying..." : "Verify & Login"}
                    {!loading && <ArrowRight className="h-5 w-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp(Array(OTP_LENGTH).fill(""));
                      setError("");
                      setMessage("");
                    }}
                    className="mt-4 text-center text-sm font-bold text-purple-700 transition hover:text-purple-900"
                  >
                    Change mobile number
                  </button>
                </form>
              )}

              {(error || message) && (
                <div className="mt-5">
                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>
                  )}
                  {message && (
                    <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{message}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;
