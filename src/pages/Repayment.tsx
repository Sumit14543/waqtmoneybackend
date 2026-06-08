import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Headphones,
  Landmark,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";

import { API_BASE_URL } from "@/config/api";

const paymentOptions = [
  {
    icon: Smartphone,
    title: "UPI Transfer",
    description: "Pay instantly using any UPI app and keep your transaction reference handy.",
  },
  {
    icon: Landmark,
    title: "Bank Transfer",
    description: "Use NEFT, IMPS, or RTGS from your bank app with your application details.",
  },
  {
    icon: CreditCard,
    title: "Debit Card",
    description: "Clear your dues through a secure card payment link shared by our team.",
  },
];

const steps = [
  "Check your outstanding amount and due date.",
  "Choose UPI, bank transfer, or a secure payment link.",
  "Complete payment and save the transaction reference.",
  "Share confirmation with support if asked.",
];

const REPAYMENT_OTP_DISABLED = false;
const isRealLoanId = (value?: string | null) => {
  const id = String(value || "").trim();
  return Boolean(id) && !/^WAQTMN-PD-/i.test(id);
};

const Repayment = () => {
  const navigate = useNavigate();
  const [pan, setPan] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpTarget, setOtpTarget] = useState("");
  const [repaymentOtpToken, setRepaymentOtpToken] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [securityAccepted, setSecurityAccepted] = useState(false);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [modalAcknowledged, setModalAcknowledged] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const inputsRef = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = window.setTimeout(() => {
      setSecondsLeft((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (!showOtpModal) return;

    const focusTimer = window.setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 100);

    return () => window.clearTimeout(focusTimer);
  }, [showOtpModal]);

  const readJsonResponse = async (res: Response) => {
    const text = await res.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { message: "Server returned an invalid response" };
    }
  };

  const handlePanChange = (value: string) => {
    setPan(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
    resetRepaymentOtpState();
  };

  const resetRepaymentOtpState = () => {
    setOtp(["", "", "", "", "", ""]);
    setOtpRequested(false);
    setOtpTarget("");
    setRepaymentOtpToken("");
    setShowOtpModal(false);
    setSecondsLeft(0);
    setError("");
    setMessage("");
  };

  const handleGetOtp = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (REPAYMENT_OTP_DISABLED) return;

    if (sendingOtp) return;

    if (otpRequested && secondsLeft > 0) {
      setShowOtpModal(true);
      setError("");
      return;
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      setError("Enter a valid PAN number");
      return;
    }

    if (!securityAccepted) {
      setError("Please read and accept the security alert");
      return;
    }

    setSendingOtp(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/application/repayment/send-otp`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pan }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        const details = Array.isArray(result.details) ? result.details.join(" ") : "";
        setError(details || result.message || "Unable to send OTP");
        return;
      }

      const targets = [result.data?.maskedPhone, result.data?.maskedEmail].filter(Boolean);
      if (result.data?.mobile) {
        sessionStorage.setItem("repaymentMobile", result.data.mobile);
      }

      setOtp(["", "", "", "", "", ""]);
      setOtpRequested(true);
      setOtpTarget(targets.join(" and "));
      setRepaymentOtpToken(result.data?.repaymentOtpToken || "");
      setSecondsLeft(Number(result.data?.ttl) || 60);
      setShowOtpModal(true);
      setMessage("OTP sent successfully. Please enter the code below.");
      window.setTimeout(() => inputsRef.current[0]?.focus(), 0);
    } catch (fetchError) {
      console.error("Repayment OTP send error:", fetchError);
      setError("Server not reachable");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const nextOtp = [...otp];
    nextOtp[index] = value.slice(-1);
    setOtp(nextOtp);
    setError("");
    setMessage("");

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
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

  const handleVerifyOtp = async () => {
    if (verifyingOtp) return;

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      setError("Enter a valid PAN number");
      return;
    }

    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setVerifyingOtp(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/application/repayment/verify-otp`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pan,
          otp: enteredOtp,
          repaymentOtpToken,
        }),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || "OTP verification failed");
        return;
      }

      setShowOtpModal(false);
      setOtpRequested(false);
      setSecondsLeft(0);
      sessionStorage.setItem("repaymentPan", pan);
      sessionStorage.setItem("repaymentApplicationId", result.data?.applicationId || "");
      if (result.data?.mobile) {
        sessionStorage.setItem("repaymentMobile", result.data.mobile);
      }
      if (isRealLoanId(result.data?.loanId)) {
        sessionStorage.setItem("repaymentLoanId", result.data.loanId);
      } else {
        sessionStorage.removeItem("repaymentLoanId");
      }
      setMessage("OTP verified successfully. Our repayment team will help you proceed securely.");
      if (result.data?.applicationId || isRealLoanId(result.data?.loanId)) {
        navigate("/repayment/make-payment");
      } else {
        setError("Repayment details were not received. Please try again.");
      }
    } catch (fetchError) {
      console.error("Repayment OTP verification error:", fetchError);
      setError("Server not reachable");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const openSecurityAlert = () => {
    setShowSecurityAlert(true);
    setModalAcknowledged(securityAccepted);
    setError("");
    setMessage("");
  };

  const confirmSecurityAlert = () => {
    if (!modalAcknowledged) {
      setError("Please acknowledge the security alert");
      return;
    }

    setSecurityAccepted(true);
    setShowSecurityAlert(false);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#f7f5ff] text-slate-950">
      <Navbar />

      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto grid max-w-7xl items-center gap-10 py-8 lg:grid-cols-[1fr_minmax(420px,0.86fr)] lg:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white px-4 py-2 text-sm font-bold text-purple-700 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Secure repayment assistance
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Repay your Waqt Money loan with confidence.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Choose a simple repayment option, complete your transfer safely, and keep your loan record clean with timely confirmation.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5  text-purple-700" />
                RBI-registered NBFC
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-700" />
                256-bit encryption
              </span>
              <span className="inline-flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-purple-700" />
                Instant confirmation
              </span>
            </div>
          </div>

          <form
            onSubmit={handleGetOtp}
            className="rounded-[28px] border border-purple-100 bg-white p-6 shadow-[0_24px_70px_rgba(91,33,182,0.13)] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-950">Repay Loan</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                  Verify your details before making any payment.
                </p>
              </div>
              <span className="rounded-full bg-purple-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-purple-700">
                Secure
              </span>
            </div>

            <p className="mt-7 text-sm leading-6 text-slate-600 sm:text-base">
              For support contact{" "}
              <a href="mailto:support@waqtmoney.com" className="font-extrabold text-purple-700">
                support@waqtmoney.com
              </a>
            </p>

            <div className="mt-7">
              <label className="text-sm font-extrabold text-slate-600">PAN Number</label>
              <input
                type="text"
                value={pan}
                onChange={(event) => handlePanChange(event.target.value)}
                autoComplete="off"
                maxLength={10}
                placeholder="ABCDE1234F"
                className="mt-3 h-14 w-full rounded-xl border border-purple-100 bg-white px-4 text-base font-black uppercase tracking-[0.22em] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-purple-600 focus:ring-4 focus:ring-purple-50"
              />
              <p className="mt-3 text-sm text-slate-500 sm:text-base">
                Enter PAN to receive OTP on your registered mobile. Repayment details are fetched from CRM using that mobile number.
              </p>
            </div>

            <label className="mt-5 flex items-start gap-3 text-sm font-bold leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={securityAccepted}
                onChange={() => {
                  if (securityAccepted) {
                    setSecurityAccepted(false);
                    return;
                  }
                  openSecurityAlert();
                }}
                className="mt-1 h-4 w-4 rounded border-slate-300 accent-purple-600"
              />
              <span>I have read the Security Alert / मैंने सुरक्षा चेतावनी पढ़ ली है</span>
            </label>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </p>
            )}
            {message && (
              <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                {message}
              </p>
            )}

            {!REPAYMENT_OTP_DISABLED && (
              <button
                type="submit"
                disabled={sendingOtp}
                className="mt-7 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-purple-600 text-base font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700"
              >
                {sendingOtp ? "Sending..." : otpRequested && secondsLeft > 0 ? "Open OTP Popup" : otpRequested ? "Send OTP Again" : "Get OTP"}
                <ArrowRight className="h-5 w-5" />
              </button>
            )}

            <p className="mt-6 text-center text-sm leading-6 text-slate-500">
              By proceeding, you agree to our terms and privacy policy.
            </p>
          </form>
        </section>

        {showOtpModal && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/65 px-3 py-3 backdrop-blur-md sm:items-center sm:px-5 sm:py-6">
            <div className="w-full max-w-[480px] overflow-hidden rounded-[26px] bg-white shadow-[0_32px_100px_rgba(15,23,42,0.38)]">
              <div className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-6">
                <div className="absolute right-[-42px] top-[-42px] h-36 w-36 rounded-full bg-purple-500/25" />
                <div className="absolute bottom-[-70px] left-[-50px] h-36 w-36 rounded-full bg-cyan-400/10" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-purple-200 ring-1 ring-white/10">
                      <ShieldCheck className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.26em] text-purple-200">
                        Secure OTP
                      </p>
                      <h2 className="mt-1 text-2xl font-black leading-tight">Verify Repayment</h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10"
                    aria-label="Close OTP popup"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="relative mt-4 text-sm leading-6 text-slate-300">
                  Enter the 6-digit code sent{otpTarget ? ` to ${otpTarget}` : " to your registered contact"}.
                </p>
              </div>

              <div className="px-5 py-6 sm:px-6">
                <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                  {otp.map((value, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputsRef.current[index] = el!;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={value}
                      onChange={(event) => handleOtpChange(event.target.value, index)}
                      onKeyDown={(event) => handleOtpKeyDown(event, index)}
                      onPaste={handleOtpPaste}
                      className="h-12 min-w-0 rounded-2xl border-2 border-purple-200 bg-white text-center text-lg font-black text-slate-950 outline-none transition focus:border-purple-600 focus:bg-purple-50 focus:shadow-[0_0_0_4px_rgba(147,51,234,0.10)] sm:h-14 sm:text-xl"
                    />
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-sm font-black text-purple-700">
                    <Clock3 className="h-4 w-4" />
                    00:{String(secondsLeft).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleGetOtp()}
                    disabled={REPAYMENT_OTP_DISABLED || sendingOtp || secondsLeft > 0}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-purple-100 bg-white px-4 text-sm font-black text-purple-700 transition hover:bg-purple-50 disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {sendingOtp ? "Sending..." : "Resend OTP"}
                  </button>
                </div>

                {error && (
                  <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                    {message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-4 py-4 text-base font-black text-white shadow-lg shadow-purple-100 transition hover:bg-purple-700 disabled:opacity-60"
                >
                  <Lock className="h-5 w-5" />
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </button>

                <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-semibold leading-5 text-slate-500">
                  Never share this OTP with anyone from calls, messages, or unknown links.
                </p>
              </div>
            </div>
          </div>
        )}

        {showSecurityAlert && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-5 sm:py-6">
            <div className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[86vh] sm:rounded-[28px]">
              <div className="flex items-center justify-between bg-purple-700 px-4 py-3 text-white sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black">!</span>
                  <h2 className="truncate text-base font-black sm:text-xl">
                    Security Alert / सुरक्षा चेतावनी
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSecurityAlert(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl font-bold transition hover:bg-white/15"
                  aria-label="Close security alert"
                >
                  x
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fbff] px-3 py-4 sm:px-4">
                <div className="rounded-2xl border-l-4 border-purple-700 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-sm leading-6 text-slate-800 sm:leading-7">
                    <span className="font-bold">English:</span> Fraudsters are sending fake payment requests via WhatsApp, SMS, and social media, impersonating <span className="font-extrabold text-purple-700">Waqt Money</span> employees. Stay alert:
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-800 sm:leading-7">
                    <span className="font-bold"> हिंदी:</span>
                    धोखेबाज़ WhatsApp, SMS और सोशल मीडिया के माध्यम से नकली भुगतान अनुरोध भेज रहे हैं, जो <span className="font-extrabold text-purple-700">Waqt Money</span>  के कर्मचारियों के रूप में पहचान बना रहे हैं। सतर्क रहें:
                  </p>
                </div>

                <div className="mt-3 grid gap-3">
                  {[
                    [
                      "Do not click unknown links or reply to suspicious messages.",
                      "अज्ञात लिंक पर क्लिक न करें या संदिग्ध संदेशों का जवाब न दें।.",
                    ],
                    [
                      "Verify email IDs and domains before engaging.",
                      "संलग्न होने से पहले ईमेल ID और डोमेन सत्यापित करें।.",
                    ],
                    [
                      "Be cautious of calls or messages claiming to be from us.",
                      "हमारे होने का दावा करने वाले कॉल या संदेशों से सावधान रहें।",
                    ],
                  ].map(([english, hindi]) => (
                    <div key={english} className="flex gap-3 rounded-2xl border border-purple-100 bg-white p-3 shadow-sm sm:p-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-700 text-base font-black text-white">
                        ✓
                      </span>
                      <div className="text-sm leading-6 text-slate-800">
                        <p><span className="font-bold">English:</span> {english}</p>
                        <p className="mt-1"><span className="font-bold">हिंदी:</span> {hindi}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-3 sm:p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-black text-orange-600">!</span>
                    <div className="text-sm leading-6 text-slate-800">
                      <p><span className="font-bold">English:</span> Waqt Money is not responsible for losses from payments to unverified persons or links.</p>
                      <p className="mt-1"><span className="font-bold">हिंदी:</span>Waqt Money अप्रमाणित व्यक्तियों या लिंक को भुगतान से होने वाले नुकसान के लिए जिम्मेदार नहीं है:</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-green-100 bg-green-50 p-3 sm:p-4">
                    <h3 className="text-sm font-black text-green-800 sm:text-base">Safe Payment /सुरक्षा चेतावनी</h3>
                    <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-800">
                      <p><span className="font-bold">English:</span> Pay only through our official Waqt Money website or authorized link.</p>
                      <p><span className="font-bold">हिंदी:</span>  payment केवल हमारी आधिकारिक वेबसाइट Waqt Money या अधिकृत लिंक से करें।</p>
                      <p><span className="font-bold">English:</span> Do not trust any unknown number or link.</p>
                      <p><span className="font-bold">हिंदी:</span> किसी अज्ञात नंबर/लिंक पर भरोसा न करें।</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
                <label className="flex items-start gap-3 text-sm font-bold leading-6 text-slate-800">
                  <input
                    type="checkbox"
                    checked={modalAcknowledged}
                    onChange={(event) => setModalAcknowledged(event.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-purple-700"
                  />
                  <span>I have read the Security Alert / मैंने सुरक्षा चेतावनी पढ़ ली है</span>
                </label>
                <button
                  type="button"
                  onClick={confirmSecurityAlert}
                  className="mt-3 h-12 w-full rounded-xl bg-purple-700 px-3 text-sm font-black text-white transition hover:bg-purple-800 sm:text-base"
                >
                  I Understand / मैं समझ गया
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="mx-auto max-w-7xl py-6">
          <div className="grid gap-4 md:grid-cols-3">
            {paymentOptions.map((option) => {
              const Icon = option.icon;

              return (
                <div key={option.title} className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold text-slate-950">{option.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 py-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Clock3 className="h-6 w-6 text-orange-300" />
              <h2 className="text-2xl font-extrabold">Repayment Checklist</h2>
            </div>
            <div className="mt-6 grid gap-4">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-purple-700">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm font-medium leading-6 text-white/85">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-950">Before You Pay</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["Use your registered mobile number", "It helps us match your payment faster."],
                ["Save transaction ID", "Keep UTR, UPI reference, or payment screenshot."],
                ["Avoid third-party accounts", "Pay only from your own verified bank account."],
                ["Ask before partial payment", "Support will confirm acceptable payment options."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl bg-purple-50/70 p-4">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  <h3 className="mt-3 text-sm font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <Headphones className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Need help with repayment?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Our support team can help confirm dues, payment reference, and closure status.
                </p>
              </div>
            </div>
            <Link
              to="/contact"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-purple-600 px-6 text-sm font-bold text-white transition hover:bg-purple-700"
            >
              Contact Support
              <Banknote className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Repayment;
