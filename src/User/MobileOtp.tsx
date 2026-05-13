import React, { useEffect, useRef, useState } from "react";
import { Clock, Pencil, ShieldCheck, Smartphone, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import UserProgress from "./UserProgress";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

const MobileOtp = () => {
  const navigate = useNavigate();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const inputsRef = useRef<HTMLInputElement[]>([]);
  const email = sessionStorage.getItem("applyEmail") ?? "";
  const phone = sessionStorage.getItem("applyPhone") ?? "";
  const otpRequired = sessionStorage.getItem("otpRequired") === "true";
  const [otpDelivery, setOtpDelivery] = useState(() => sessionStorage.getItem("otpDelivery") ?? "email");
  const [otpChannels, setOtpChannels] = useState<string[]>(() => {
    try {
      const savedChannels = JSON.parse(sessionStorage.getItem("otpChannels") || "[]");
      return Array.isArray(savedChannels) ? savedChannels : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = window.setTimeout(() => {
      setSecondsLeft((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  const readJsonResponse = async (res: Response) => {
    const text = await res.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return { message: "Server returned an invalid response" };
    }
  };

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");
    setMessage("");

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedOtp = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
      .split("");

    if (!pastedOtp.length) return;

    const nextOtp = ["", "", "", "", "", ""];
    pastedOtp.forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);
    inputsRef.current[Math.min(pastedOtp.length, 6) - 1]?.focus();
  };

  const resendOtp = async () => {
    if ((!phone && !email) || resending || secondsLeft > 0) return;

    setResending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/otp/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, email: email || undefined }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        const details = Array.isArray(result.details) ? result.details.join(" ") : "";
        setError(details || result.message || "Unable to resend OTP");
        return;
      }

      const nextDelivery = result.data?.delivery || "email";
      sessionStorage.setItem("otpDelivery", nextDelivery);
      setOtpDelivery(nextDelivery);

      const nextChannels = result.data?.channels || [];
      sessionStorage.setItem("otpChannels", JSON.stringify(nextChannels));
      setOtpChannels(nextChannels);

      setOtp(["", "", "", "", "", ""]);
      setSecondsLeft(60);
      setMessage("OTP resent successfully");
      inputsRef.current[0]?.focus();
    } catch (fetchError) {
      console.error("OTP resend error:", fetchError);
      setError("Server not reachable");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;

    const enteredOtp = otp.join("");

    if (!phone && !email) {
      setError("Contact not found. Please submit the application again.");
      return;
    }

    if (enteredOtp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/otp/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          phone,
          otp: enteredOtp,
        }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || "OTP verification failed");
        return;
      }

      navigate("/user/basic-details");
    } catch (fetchError) {
      console.error("OTP verification error:", fetchError);
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  const timerText = `00:${String(secondsLeft).padStart(2, "0")}`;
  const deliveryLabel =
    otpChannels.length > 0
      ? otpChannels.join(" and ")
      : otpDelivery === "both"
        ? "WhatsApp and Email"
        : otpDelivery === "whatsapp"
          ? "WhatsApp"
          : "Email";

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">
      <Navbar />

      <div className="flex-1 px-4 pb-16 pt-24 md:pt-28">
        <div className="mx-auto w-full max-w-[760px]">
          <UserProgress activeStep={1} />

          <div className="mx-auto w-full max-w-[480px] overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white shadow-[0_18px_60px_rgba(32,56,85,0.10)]">
            <div className="border-b border-[#dfe7f2] px-6 py-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eaff]">
                <Smartphone className="h-7 w-7 text-[#8048e2]" />
              </div>

              <h2 className="mt-4 text-xl font-bold text-[#071d3a]">
                Verify OTP
              </h2>

              <p className="mt-2 text-sm font-medium text-[#52657d]">
                {otpRequired
                  ? `A 6-digit code has been sent via ${deliveryLabel}`
                  : "A 6-digit code is required to continue."}
              </p>

              <div className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-[#071d3a]">
                <span>{phone || email || "Contact not available"}</span>
                <button
                  type="button"
                  onClick={() => navigate("/user/apply")}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f3eaff] text-[#8048e2]"
                  aria-label="Edit mobile number"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              {email && (
                <p className="mt-1 text-sm font-semibold text-[#071d3a]">
                  {email}
                </p>
              )}
            </div>

            <div className="px-5 py-7 sm:px-7 sm:py-9">
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2 md:gap-3">
                {otp.map((value, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputsRef.current[index] = el!)}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={value}
                    onChange={(event) => handleChange(event.target.value, index)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    onPaste={handlePaste}
                    className="h-14 min-w-0 rounded-lg border-2 border-[#d8c5ff] bg-white text-center text-xl font-semibold text-[#071d3a] outline-none transition focus:border-[#8048e2] focus:bg-[#f7f1ff]"
                  />
                ))}
              </div>

              <div className="mt-3 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#f3eaff] px-4 py-2 text-sm font-semibold text-[#8048e2]">
                  <Clock className="h-4 w-4" />
                  {timerText}
                </span>
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              {message && (
                <p className="mt-4 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700">
                  {message}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 h-[52px] w-full rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </button>

              <p className="mt-5 text-center text-sm font-medium text-[#52657d]">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={(!phone && !email) || resending || secondsLeft > 0}
                  className="font-semibold text-[#8048e2] disabled:text-[#b9a5dc]"
                >
                  {resending ? "Sending..." : "Resend OTP"}
                </button>
              </p>
            </div>

            <div className="flex items-center justify-center gap-6 border-t border-[#dfe7f2] bg-[#f8fafc] px-6 py-4 text-xs font-semibold text-[#52657d]">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#12b76a]" />
                100% Encrypted
              </span>
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#12b76a]" />
                Secure Connection
              </span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MobileOtp;
