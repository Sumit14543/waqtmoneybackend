import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import { ArrowRight, Clock, LogIn, Phone, ShieldCheck, Smartphone } from "lucide-react";

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

  const normalizeMobileInput = (value: string) => value.replace(/\D/g, "").slice(0, 10);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp: enteredOtp }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || result.error || "OTP verification failed");
        return;
      }

      localStorage.setItem("authToken", result.token || "");
      localStorage.setItem("authUser", JSON.stringify(result.user || {}));
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
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,#f3e8ff_0,#f8f6ff_32%,#ffffff_100%)] pt-20">
      <Navbar />

      <div className="flex flex-1 items-center justify-center px-3 py-8 sm:px-4 sm:py-12">
        <div className="flex min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-[26px] border border-purple-100 bg-white shadow-[0_24px_70px_rgba(91,33,182,0.16)] md:min-h-[540px] md:flex-row">
          <div className="relative flex w-full flex-col justify-between overflow-hidden bg-slate-950 p-6 text-white sm:p-8 md:w-1/2">
            <div>
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-orange-300 ring-1 ring-white/10">
                <ShieldCheck className="h-8 w-8" />
              </span>
              <h1 className="text-4xl font-black">Waqt Money</h1>
              <p className="mt-3 max-w-sm text-base font-semibold leading-7 text-slate-300">
                Securely access your loan dashboard, repayments, and application journey.
              </p>
            </div>
            <div className="relative mt-8 rounded-2xl border border-white/10 bg-white/[0.07] p-5 text-sm font-semibold leading-6 text-slate-200">
              Login using the OTP sent to your registered mobile number.
            </div>
          </div>

          <div className="flex w-full flex-col justify-center p-5 sm:p-7 md:w-1/2 lg:p-10">
            <div className="mb-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
                {otpSent ? <Smartphone className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              </span>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                {otpSent ? "Verify OTP" : "Login with Mobile"}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {otpSent ? `Enter the 6-digit OTP sent to ${mobile}` : "Enter your mobile number to continue."}
              </p>
            </div>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="flex flex-col justify-center">
                <div className="relative mb-4">
                  <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={mobile}
                    onChange={(event) => setMobile(normalizeMobileInput(event.target.value))}
                    placeholder="Mobile Number"
                    className="h-14 w-full rounded-xl border border-purple-100 p-3 pl-11 text-base font-bold outline-none transition focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700 disabled:opacity-60"
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
                      className="h-14 min-w-0 rounded-lg border-2 border-purple-100 bg-white text-center text-xl font-black text-slate-950 outline-none transition focus:border-purple-600 focus:bg-purple-50"
                    />
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-sm font-bold">
                  <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-purple-700">
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
                  className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700 disabled:opacity-60"
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

      <Footer />
    </div>
  );
};

export default Login;
