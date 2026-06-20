import React, { useEffect, useRef, useState } from "react";
import { Clock, Pencil, ShieldCheck, Smartphone, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import UserProgress from "./UserProgress";

import { API_BASE_URL } from "@/config/api";

type OtpDeliveryData = {
  delivery?: string;
  channels?: string[];
};

const MobileOtp = () => {
  const navigate = useNavigate();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const inputsRef = useRef<HTMLInputElement[]>([]);
  const [email, setEmail] = useState(() => sessionStorage.getItem("applyEmail") ?? "");
  const [phone, setPhone] = useState(() => sessionStorage.getItem("applyPhone") ?? "");
  const [draftEmail, setDraftEmail] = useState(() => sessionStorage.getItem("applyEmail") ?? "");
  const [draftPhone, setDraftPhone] = useState(() => sessionStorage.getItem("applyPhone") ?? "");
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

  const digitsOnly = (value: string) => value.replace(/\D/g, "");

  const resetOtpEntry = () => {
    setOtp(["", "", "", "", "", ""]);
    window.setTimeout(() => inputsRef.current[0]?.focus(), 0);
  };

  const persistOtpDelivery = (data?: OtpDeliveryData) => {
    const nextDelivery = data?.delivery || "email";
    sessionStorage.setItem("otpDelivery", nextDelivery);
    setOtpDelivery(nextDelivery);

    const nextChannels = Array.isArray(data?.channels) ? data.channels : [];
    sessionStorage.setItem("otpChannels", JSON.stringify(nextChannels));
    setOtpChannels(nextChannels);
  };

  const validateContact = (nextPhone: string, nextEmail: string) => {
    if (!/^[6-9]\d{9}$/.test(nextPhone)) {
      return "Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.";
    }

    if (!nextEmail.trim()) {
      return "Email is required for OTP delivery.";
    }

    if (!/^\S+@\S+\.\S+$/.test(nextEmail.trim())) {
      return "Enter a valid email address.";
    }

    return "";
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

  const sendOtpForContact = async (nextPhone: string, nextEmail: string) => {
    const response = await fetch(`${API_BASE_URL}/otp/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: nextPhone, email: nextEmail }),
    });

    const result = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(result.message || "OTP could not be delivered. Please try again.");
    }

    persistOtpDelivery(result.data);
    return result;
  };

  const handleEditContact = () => {
    setDraftPhone(phone);
    setDraftEmail(email);
    setEditingContact(true);
    setError("");
    setMessage("");
  };

  const saveChangedContact = async () => {
    if (savingContact) return;

    const nextPhone = digitsOnly(draftPhone).slice(0, 10);
    const nextEmail = draftEmail.trim().toLowerCase();
    const validationError = validateContact(nextPhone, nextEmail);

    if (validationError) {
      setError(validationError);
      return;
    }

    const applicationId =
      sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId") || "";

    setSavingContact(true);
    setError("");
    setMessage("");

    try {
      if (applicationId) {
        const updateResponse = await fetch(`${API_BASE_URL}/application/update`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: applicationId,
            phone: nextPhone,
            email: nextEmail,
          }),
        });

        const updateResult = await readJsonResponse(updateResponse);
        if (!updateResponse.ok) {
          throw new Error(updateResult.message || "Unable to update contact details");
        }
      }

      await sendOtpForContact(nextPhone, nextEmail);

      setPhone(nextPhone);
      setEmail(nextEmail);
      sessionStorage.setItem("applyPhone", nextPhone);
      localStorage.setItem("applyPhone", nextPhone);
      sessionStorage.setItem("applyEmail", nextEmail);
      localStorage.setItem("applyEmail", nextEmail);
      sessionStorage.setItem("otpRequired", "true");

      setEditingContact(false);
      setSecondsLeft(60);
      resetOtpEntry();
      setMessage("Contact updated. A fresh OTP has been sent.");
    } catch (fetchError) {
      console.error("Contact update error:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to update contact details");
    } finally {
      setSavingContact(false);
    }
  };

  const resendOtp = async () => {
    if ((!phone && !email) || resending || secondsLeft > 0) return;

    setResending(true);
    setError("");
    setMessage("");

    try {
      await sendOtpForContact(phone, email);
      resetOtpEntry();
      setSecondsLeft(60);
      setMessage("OTP resent successfully");
    } catch (fetchError) {
      console.error("OTP resend error:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Server not reachable");
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
      const applicationId =
        sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId");
      const response = await fetch(`${API_BASE_URL}/otp/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          phone,
          otp: enteredOtp,
          applicationId,
        }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || "OTP verification failed");
        return;
      }

      if (result.applicationUploadToken) {
        sessionStorage.setItem("applicationUploadToken", String(result.applicationUploadToken));
        localStorage.setItem("applicationUploadToken", String(result.applicationUploadToken));
      }

      if (applicationId) {
        await fetch(`${API_BASE_URL}/application/update`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: applicationId,
            current_step: "otp_verified",
          }),
        }).catch((updateError) => {
          console.error("OTP step update error:", updateError);
        });
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
                  onClick={handleEditContact}
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
              {editingContact && (
                <div className="mb-6 rounded-2xl border border-[#d8c5ff] bg-[#fbf9ff] p-4">
                  <h3 className="text-sm font-extrabold text-[#071d3a]">
                    Change OTP contact
                  </h3>
                  <p className="mt-1 text-xs font-medium leading-5 text-[#52657d]">
                    Update your mobile number or email, then we will send a fresh OTP.
                  </p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-[#071d3a]">
                        Mobile number
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="tel"
                        value={draftPhone}
                        onChange={(event) => setDraftPhone(digitsOnly(event.target.value).slice(0, 10))}
                        className="mt-1 h-11 w-full rounded-lg border border-[#d8c5ff] bg-white px-3 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#071d3a]">
                        Email
                      </label>
                      <input
                        type="email"
                        autoComplete="email"
                        value={draftEmail}
                        onChange={(event) => setDraftEmail(event.target.value)}
                        className="mt-1 h-11 w-full rounded-lg border border-[#d8c5ff] bg-white px-3 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingContact(false);
                        setError("");
                      }}
                      className="h-11 rounded-lg border border-[#d8c5ff] bg-white text-sm font-bold text-[#52657d]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveChangedContact}
                      disabled={savingContact}
                      className="h-11 rounded-lg bg-[#8048e2] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.18)] disabled:opacity-60"
                    >
                      {savingContact ? "Sending..." : "Update & Send OTP"}
                    </button>
                  </div>
                </div>
              )}

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
