import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightCircle, CalendarDays, ChevronDown, FileText, Lock, Zap } from "lucide-react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import BrandLogo from "@/Components/BrandLogo";

import { API_BASE_URL } from "@/config/api";

const steps = [
  "Basic Details",
  "PAN Verify",
  "Aadhaar Verify",
  "Work Details",
  "Bank Details",
  "References",
  "Upload Docs",
  "Video KYC",
];

type ApplyField = "salary" | "loanAmount" | "purpose" | "hasLoan" | "phone" | "email" | "agree";

const MIN_SALARY = 20000;
const MIN_LOAN_AMOUNT = 5000;

const Apply = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const salaryRef = useRef<HTMLInputElement>(null);
  const loanAmountRef = useRef<HTMLInputElement>(null);
  const purposeRef = useRef<HTMLSelectElement>(null);
  const hasLoanNoRef = useRef<HTMLButtonElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const agreeRef = useRef<HTMLInputElement>(null);

  const [showIntro, setShowIntro] = useState(true);
  const [employment, setEmployment] = useState("salaried");
  const [salary, setSalary] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hasLoan, setHasLoan] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [savedApplicationId, setSavedApplicationId] = useState("");

  const digitsOnly = (value: string) => value.replace(/\D/g, "");

  const formatAmount = (value: string) => {
    const raw = digitsOnly(value);
    if (!raw) return "";
    return new Intl.NumberFormat("en-IN").format(Number(raw));
  };

  const parseAmount = (value: string) => value.replace(/,/g, "");

  const formatCurrency = (amount: number) => `Rs ${new Intl.NumberFormat("en-IN").format(amount)}`;

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const focusField = (field: ApplyField) => {
    const focusMap = {
      salary: salaryRef.current,
      loanAmount: loanAmountRef.current,
      purpose: purposeRef.current,
      hasLoan: hasLoanNoRef.current,
      phone: phoneRef.current,
      email: emailRef.current,
      agree: agreeRef.current,
    };

    const target = focusMap[field];
    target?.focus();

    if (target instanceof HTMLInputElement && target.type === "text") {
      target.select();
    }
  };

  const showError = async (message: string, field?: ApplyField) => {
    setError(message);

    await Swal.fire({
      icon: "error",
      title: "Action needed",
      html: `<p class="mx-auto max-w-[300px] text-sm font-medium leading-6 text-slate-600">${escapeHtml(message)}</p>`,
      width: 420,
      padding: "2rem 1.75rem 1.5rem",
      background: "#ffffff",
      color: "#071d3a",
      iconColor: "#ef646c",
      backdrop: "rgba(15, 23, 42, 0.58)",
      confirmButtonText: "Got it",
      buttonsStyling: false,
      showClass: {
        popup: "swal2-show",
        backdrop: "swal2-backdrop-show",
      },
      hideClass: {
        popup: "swal2-hide",
        backdrop: "swal2-backdrop-hide",
      },
      customClass: {
        popup:
          "rounded-[22px] border border-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.22)]",
        icon: "mt-1 border-[3px]",
        title: "pt-2 text-[24px] font-extrabold tracking-normal text-slate-950",
        htmlContainer: "mt-1",
        actions: "mt-6",
        confirmButton:
          "inline-flex h-11 min-w-[120px] items-center justify-center rounded-xl bg-gradient-to-r from-[#8048e2] to-[#bd56e4] px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(128,72,226,0.28)] outline-none transition hover:opacity-95 focus-visible:ring-4 focus-visible:ring-purple-200",
      },
    });

    focusField(field || "salary");
  };

  const validate = (): { message: string; field: ApplyField } | null => {
    const salaryAmount = Number(parseAmount(salary));
    const requestedLoanAmount = Number(parseAmount(loanAmount));

    if (!salary) {
      return { message: "Please enter your monthly salary.", field: "salary" };
    }

    if (salaryAmount < MIN_SALARY) {
      return {
        message: `Salary less than ${formatCurrency(MIN_SALARY)} is not accepted.`,
        field: "salary",
      };
    }

    if (!loanAmount) {
      return { message: "Please enter the loan amount you need.", field: "loanAmount" };
    }

    if (requestedLoanAmount < MIN_LOAN_AMOUNT) {
      return {
        message: `Loan amount less than ${formatCurrency(MIN_LOAN_AMOUNT)} is not accepted.`,
        field: "loanAmount",
      };
    }

    if (!purpose) {
      return { message: "Please select the purpose of your loan.", field: "purpose" };
    }

    if (!hasLoan) {
      return { message: "Please tell us if you already have a running loan.", field: "hasLoan" };
    }

    if (!phone) {
      return { message: "Please enter your mobile number.", field: "phone" };
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      return {
        message: "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",
        field: "phone",
      };
    }

    if (!email.trim()) {
      return { message: "Please enter your email address.", field: "email" };
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { message: "Please enter a valid email address.", field: "email" };
    }

    if (!agree) {
      return { message: "Please accept the Terms and Privacy Policy to continue.", field: "agree" };
    }

    return null;
  };

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

  const clearApplicationSession = () => {
    [
      "applicationId",
      "applyPhone",
      "applyEmail",
      "applyPan",
      "employment",
      "otpRequired",
      "otpDelivery",
      "otpChannels",
      "panVerification",
      "aadhaarMasked",
    ].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
  };

  const getResumePath = (currentStep?: string) => {
    const step = String(currentStep || "").toLowerCase();
    const routes: Record<string, string> = {
      otp_pending: "/user/otp",
      apply_started: "/user/otp",
      otp_verified: "/user/basic-details",
      basic_details: "/user/pan-verification",
      pan_verify: "/user/kyc-aadhaar",
      aadhaar_verify: "/user/kyc-aadhaar",
      aadhaar_callback: "/user/kyc-aadhaar",
      react_aadhaar_verify: "/user/kyc-aadhaar",
      react_aadhaar_callback: "/user/kyc-aadhaar",
      work_details: "/user/work-details",
      bank_details: "/user/bank-details",
      references: "/user/references",
      upload_docs: "/user/salary-slip",
      documents_uploaded: "/user/customer-video-kyc",
      video_kyc_completed: "/user/loan-status",
    };
      
    return routes[step] || "/user/otp";
  };

  const handleApplyStart = () => {
    const existingApplicationId =
      sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId") || "";

    if (existingApplicationId) {
      setSavedApplicationId(existingApplicationId);
      setResumePrompt(true);
      return;
    }

    setShowIntro(false);
  };

  const handleFreshApplication = () => {
    clearApplicationSession();
    setResumePrompt(false);
    setSavedApplicationId("");
    setEmployment("salaried");
    setSalary("");
    setLoanAmount("");
    setPurpose("");
    setHasLoan("");
    setPhone("");
    setEmail("");
    setAgree(true);
    setError("");
    setShowIntro(false);
  };

  const handleResumeApplication = async () => {
    if (!savedApplicationId || resumeLoading) return;

    setResumeLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/application/${savedApplicationId}`);
      const result = await readJsonResponse(response);

      if (!response.ok || !result.data) {
        clearApplicationSession();
        setResumePrompt(false);
        setShowIntro(false);
        return;
      }

      const application = result.data;
      sessionStorage.setItem("applicationId", String(savedApplicationId));
      localStorage.setItem("applicationId", String(savedApplicationId));

      if (application.mobile) {
        sessionStorage.setItem("applyPhone", String(application.mobile));
        localStorage.setItem("applyPhone", String(application.mobile));
      }

      if (application.email) {
        sessionStorage.setItem("applyEmail", String(application.email));
        localStorage.setItem("applyEmail", String(application.email));
      }

      if (application.employment_status) {
        sessionStorage.setItem("employment", String(application.employment_status));
        localStorage.setItem("employment", String(application.employment_status));
      }

      if (application.pan_number) {
        sessionStorage.setItem("applyPan", String(application.pan_number));
      }

      navigate(getResumePath(application.current_step), { replace: true });
    } catch (fetchError) {
      console.error("Resume application error:", fetchError);
      showError("Unable to resume application. Please try fresh.");
    } finally {
      setResumeLoading(false);
    }
  };

  const moveToNextControl = (target: HTMLElement) => {
    const controls = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>("[data-apply-control]") || []
    ).filter((control) => !control.hasAttribute("disabled"));
    const currentIndex = controls.indexOf(target);
    const nextControl = controls[currentIndex + 1];

    if (nextControl) {
      nextControl.focus();
      return;
    }

    handleSubmit();
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;

    const target = e.target as HTMLElement;
    const canMoveFocus = target.hasAttribute("data-apply-control");

    if (!canMoveFocus) return;

    e.preventDefault();

    if (target instanceof HTMLButtonElement) {
      target.click();
      const nextField = target.dataset.nextField as ApplyField | undefined;
      if (nextField) {
        focusField(nextField);
        return;
      }
    } else if (target instanceof HTMLInputElement && target.type === "checkbox") {
      target.click();
      handleSubmit();
      return;
    }

    moveToNextControl(target);
  };

  const handleSubmit = async () => {
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      showError(validationError.message, validationError.field);
      return;
    }

    setLoading(true);
    setError("");

    const applicationData = {
      employment,
      salary: Number(parseAmount(salary)),
      phone,
      email: email.trim(),
      termsAccepted: agree,
    };

    const loanData = {
      amount: Number(parseAmount(loanAmount)),
      purpose,
      hasLoan,
    };

    try {
      const appRes = await fetch(`${API_BASE_URL}/application/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(applicationData),
      });

      const appResult = await readJsonResponse(appRes);

      if (!appRes.ok) {
        showError(appResult.message || "Application failed");
        return;
      }

      const applicationId = appResult.data?.applicationId || appResult.data?.id;

      if (!applicationId) {
        showError("Application ID not received from server");
        return;
      }

      const loanRes = await fetch(`${API_BASE_URL}/loan/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: applicationId,
          ...loanData,
        }),
      });

      const loanResult = await readJsonResponse(loanRes);

      if (!loanRes.ok) {
        showError(loanResult.message || "Loan details failed");
        return;
      }

      const otpRes = await fetch(`${API_BASE_URL}/otp/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, email: email.trim() }),
      });

      const otpResult = await readJsonResponse(otpRes);

      if (!otpRes.ok) {
        showError(otpResult.message || "OTP could not be delivered. Please try again.");
        return;
      }

      sessionStorage.setItem("applicationId", String(applicationId));
      sessionStorage.setItem("applyPhone", phone);
      sessionStorage.setItem("otpRequired", "true");
      sessionStorage.setItem("otpDelivery", otpResult.data?.delivery || "email");
      sessionStorage.setItem(
        "otpChannels",
        JSON.stringify(otpResult.data?.channels || ["Email"])
      );
      sessionStorage.setItem("applyEmail", email.trim());
      localStorage.setItem("applyEmail", email.trim());
      sessionStorage.setItem("employment", employment);
      localStorage.setItem("applicationId", String(applicationId));
      localStorage.setItem("applyPhone", phone);
      localStorage.setItem("employment", employment);

      navigate("/user/otp", { replace: true });
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      showError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  if (showIntro) {
    const introCards = [
      {
        title: "Personal Loan Application",
        description:
          "Apply online for a personal loan and get instant approval with a quick, hassle-free process.",
        icon: Zap,
        color: "text-orange-500",
      },
      {
        title: "Easy Loan Approval",
        description:
          "Get quick approval with minimal paperwork and fast verification when you need funds.",
        icon: FileText,
        color: "text-purple-600",
      },
      {
        title: "Flexible Loan Plan",
        description:
          "Choose an amount that fits your needs and continue with a simple digital application.",
        icon: CalendarDays,
        color: "text-orange-500",
      },
    ];

    const infoSections = [
      {
        title: "Why Choose Waqt Money",
        items: [
          "Loan Amount: From Rs 1,000 up to Rs 2 Lakhs",
          "Instant Transfer: Get funds directly in your bank account within 24 hours",
          "Flexible Tenure: Easy repayment options up to 3 months",
          "100% Online Process: No queues, no visits, no hassle",
          "Minimal Documentation: Just your PAN and Aadhaar",
          "No Collateral Required: Completely unsecured loan",
          "Zero Foreclosure Charges: Repay early anytime with no extra fees",
        ],
      },
      {
        title: "Example: How Personal Loans Work",
        intro: "Assuming you borrow Rs 5,00,000 for a tenure of 3 years:",
        items: [
          "Loan Amount: Rs 5,00,000",
          "Processing Fee: 3% of loan amount + 18% GST + Rs 500 stamp duty = Rs 18,200",
          "Interest Rate: 20% p.a. on reducing principal balance",
          "Monthly EMI: Rs 18,582",
          "Total Repayment: Rs 6,68,952",
          "Total Interest Payable: Rs 1,68,944",
          "APR: 22.7%",
        ],
      },
      {
        title: "Personal Loan Eligibility Criteria",
        items: [
          "Age: Between 21 and 55 years",
          "Minimum Monthly Income: Rs 18,000 in metro cities and Rs 15,000 in non-metro cities",
          "Residency: Must be a resident of India",
        ],
      },
      {
        title: "Documents Required",
        items: ["PAN Card", "Aadhaar Card"],
      },
      {
        title: "Waqt Money Charges",
        items: [
          "Interest Rate: Starting from 18% p.a.",
          "Processing Fee: 2% - 10% of loan amount",
          "Late Payment Fee: Rs 500 per missed EMI",
          "Bounced Payment Fee: Rs 500",
          "APR: Starting from 16.75%",
        ],
      },
    ];

    const applicationSteps = [
      "Fill in your basic details",
      "Select your desired loan amount and repayment tenure",
      "Complete verification with required documents",
      "Receive the money directly in your bank account after approval",
    ];

    return (
      <div className="min-h-screen bg-[#f6f4ff]">
        <Navbar />
        <main className="px-4 pb-12 pt-24">
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-[28px] bg-white shadow-xl shadow-purple-100/70">
          <section className="rounded-b-[28px] bg-[linear-gradient(135deg,#f1edff,#fff7ed)] px-6 pb-7 pt-6 text-center">
            <BrandLogo className="mx-auto h-12 w-auto object-contain" priority />

            <p className="mx-auto mt-4 max-w-sm text-base font-semibold leading-7 text-slate-950 sm:text-lg">
              Instant Online Personal Loan for Salaried Employees
            </p>

            <p className="mt-4 text-sm font-bold text-slate-950">
              up to{" "}
              <span className="align-middle text-3xl font-extrabold text-purple-700 sm:text-4xl">
                Rs 1,00,000
              </span>
            </p>

            <button
              type="button"
              onClick={handleApplyStart}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-base font-bold text-white shadow-lg shadow-purple-200 transition hover:bg-purple-700"
            >
              Apply Now
              <ArrowRightCircle className="h-5 w-5" />
            </button>
          </section>

          {resumePrompt && (
            <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 text-left shadow-2xl">
                <h2 className="text-xl font-extrabold text-slate-950">
                  Resume application?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  We found an unfinished application. You can continue from where you stopped or start a fresh one.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleFreshApplication}
                    className="h-12 rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                  >
                    Start Fresh
                  </button>
                  <button
                    type="button"
                    onClick={handleResumeApplication}
                    disabled={resumeLoading}
                    className="h-12 rounded-full bg-purple-600 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-60"
                  >
                    {resumeLoading ? "Resuming..." : "Resume"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="flex-1 px-4 py-5">
            <div className="space-y-4">
              {introCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="flex gap-4 rounded-xl bg-[#f0f2ff] px-5 py-4 shadow-sm ring-1 ring-purple-50"
                  >
                    <span className={`mt-1 shrink-0 ${card.color}`}>
                      <Icon className="h-6 w-6" />
                    </span>

                    <div>
                        <h2 className="text-base font-bold text-slate-950">
                        {card.title}
                      </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                        {card.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
              <h1 className="text-lg font-extrabold text-slate-950">
                Need Instant Cash?
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Get quick financial help with Waqt Money, your trusted instant
                personal loan platform. Apply in minutes and get funds directly
                credited to your bank account. Fast, secure, and hassle-free.
              </p>
            </div>

            <div className="mt-5 space-y-5">
              {infoSections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5"
                >
                  <h2 className="text-base font-extrabold text-slate-950">
                    {section.title}
                  </h2>
                  {section.intro && (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {section.intro}
                    </p>
                  )}
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-sm leading-6 text-slate-600"
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
                <h2 className="text-base font-extrabold text-slate-950">
                  How to Apply for an Instant Personal Loan
                </h2>
                <ol className="mt-3 space-y-2">
                  {applicationSteps.map((step, index) => (
                    <li
                      key={step}
                      className="flex gap-3 text-sm leading-6 text-slate-600"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-orange-400 p-5 text-white shadow-lg shadow-purple-100">
                <h2 className="text-base font-extrabold">About Waqt Money</h2>
                <p className="mt-2 text-sm leading-6 text-white/90">
                  Waqt Money empowers individuals across income groups with
                  short-term instant cash loans, personal loans, and customized
                  EMI-based plans through a simple digital process.
                </p>
                <div className="mt-4 space-y-2 text-sm font-medium text-white/95">
                  <p>Telephone: +91 9217086608</p>
                  <p>Email: support@waqtmoney.com</p>
                  <p>Visit Us: H-15, Sector 63, Noida, Uttar Pradesh, India</p>
                </div>
              </div>
            </div>
          </section>
        </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">
      <Navbar />

      <div className="flex-1 px-3 pb-16 pt-24 sm:px-4 md:pt-28">
        <div className="mx-auto w-full max-w-[600px]">
          <div className="mx-auto mb-8 hidden w-full max-w-[900px] items-start md:flex">
            {steps.map((step, index) => {
              const isActive = index === 0;

              return (
                <div key={step} className="relative flex flex-1 flex-col items-center">
                  {index > 0 && (
                    <span className="absolute right-1/2 top-[17px] h-px w-full bg-[#d8e1ee]" />
                  )}
                  <span
                    className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold ${isActive
                        ? "border-[#d8c5ff] bg-[#8048e2] text-white shadow-[0_0_0_5px_rgba(128,72,226,0.12)]"
                        : "border-[#d8e1ee] bg-white text-[#718096]"
                      }`}
                  >
                    {index + 1}
                  </span>
                  <span className="mt-2 max-w-[76px] text-center text-[10px] font-semibold uppercase leading-3 text-[#31435d]">
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          <form
            ref={formRef}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            onKeyDown={handleFormKeyDown}
            className="mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border border-[#dfe7f2] bg-white shadow-[0_18px_60px_rgba(32,56,85,0.10)]"
          >
            <div className="border-b border-[#dfe7f2] px-5 py-7 text-center sm:px-6 md:px-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3eaff]">
                <Lock className="h-7 w-7 text-[#8048e2]" />
              </div>

              <h2 className="mt-4 text-xl font-bold text-[#071d3a]">
                Apply for Payday Loan 
              </h2>

              <p className="mt-2 text-sm font-medium text-[#52657d]">
                Get started in minutes with a few simple steps.
              </p>
            </div>

            <div className="px-5 py-7 sm:px-6 sm:py-8 md:px-10 md:py-10">
              {error && (
                <p
                  aria-live="polite"
                  className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600"
                >
                  {error}
                </p>
              )}

              <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-[#071d3a]">
                    Employment Status <span className="text-red-500">*</span>
                  </label>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      data-apply-control
                      data-next-field="salary"
                      aria-pressed={employment === "salaried"}
                      onClick={() => setEmployment("salaried")}
                      className={`h-[47px] rounded-lg border text-sm font-bold transition ${employment === "salaried"
                          ? "border-[#8048e2] bg-[#8048e2] text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)]"
                          : "border-[#d8c5ff] bg-white text-[#62718a]"
                        }`}
                    >
                      Salaried
                    </button>

                    <button
                      type="button"
                      data-apply-control
                      data-next-field="salary"
                      aria-pressed={employment === "self"}
                      onClick={() => setEmployment("self")}
                      className={`h-[47px] rounded-lg border text-sm font-bold transition ${employment === "self"
                          ? "border-[#8048e2] bg-[#8048e2] text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)]"
                          : "border-[#d8c5ff] bg-white text-[#62718a]"
                        }`}
                    >
                      Self Employed
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-[#071d3a]">
                    Monthly Salary <span className="text-red-500">*</span>
                  </label>

                  <div className="mt-3 flex h-[54px] overflow-hidden rounded-lg border border-[#d9e3f0] bg-white focus-within:border-[#15833d]">
                    <span className="flex w-[42px] items-center justify-center border-r border-[#d9e3f0] bg-[#f8fafc] text-lg font-semibold text-[#52657d]">
                      {"\u20b9"}
                    </span>
                    <input
                      ref={salaryRef}
                      data-apply-control
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={salary}
                      onChange={(e) => setSalary(formatAmount(e.target.value))}
                      placeholder="10,000"
                      className="min-w-0 flex-1 px-4 text-base font-semibold text-[#071d3a] outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-[#718096]">
                    Minimum monthly salary: {formatCurrency(MIN_SALARY)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-bold text-[#071d3a]">
                    Loan Amount Required <span className="text-red-500">*</span>
                  </label>

                  <div className="mt-3 flex h-[54px] overflow-hidden rounded-lg border border-[#d8c5ff] bg-white focus-within:border-[#8048e2]">
                    <span className="flex w-[42px] items-center justify-center border-r border-[#d9e3f0] bg-[#f8fafc] text-lg font-semibold text-[#52657d]">
                      {"\u20b9"}
                    </span>
                    <input
                      ref={loanAmountRef}
                      data-apply-control
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(formatAmount(e.target.value))}
                      placeholder="5,000"
                      className="min-w-0 flex-1 px-4 text-base font-semibold text-[#071d3a] outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs font-medium text-[#718096]">
                    Minimum loan amount: {formatCurrency(MIN_LOAN_AMOUNT)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-bold text-[#071d3a]">
                    Purpose of Loan <span className="text-red-500">*</span>
                  </label>

                  <div className="relative mt-3">
                    <select
                      ref={purposeRef}
                      data-apply-control
                      value={purpose}
                      autoComplete="off"
                      onChange={(e) => setPurpose(e.target.value)}
                      className="h-[54px] w-full appearance-none rounded-lg border border-[#d8c5ff] bg-white px-4 pr-10 text-base font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]"
                    >
                      <option value="">Select option</option>
                      <option value="Debt Consolidation">Debt Consolidation</option>
                      <option value="Medical Emergency">Medical Emergency</option>
                      <option value="Education Expenses">Education Expenses</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Travel">Travel</option>
                      <option value="Home Renovation">Home Renovation</option>
                      <option value="Other Personal Needs">Other Personal Needs</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4d6380]" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-[#071d3a]">
                    Any running loan? <span className="text-red-500">*</span>
                  </label>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      ref={hasLoanNoRef}
                      type="button"
                      data-apply-control
                      data-next-field="phone"
                      aria-pressed={hasLoan === "no"}
                      onClick={() => setHasLoan("no")}
                      className={`h-[47px] rounded-lg border text-sm font-bold transition ${hasLoan === "no"
                          ? "border-[#8048e2] bg-[#8048e2] text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)]"
                          : "border-[#d8c5ff] bg-white text-[#62718a]"
                        }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      data-apply-control
                      data-next-field="phone"
                      aria-pressed={hasLoan === "yes"}
                      onClick={() => setHasLoan("yes")}
                      className={`h-[47px] rounded-lg border text-sm font-bold transition ${hasLoan === "yes"
                          ? "border-[#8048e2] bg-[#8048e2] text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)]"
                          : "border-[#d8c5ff] bg-white text-[#62718a]"
                        }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-[#071d3a]">
                    Phone <span className="text-red-500">*</span>
                  </label>

                  <div className="mt-3 flex h-[54px] overflow-hidden rounded-lg border border-[#168544] bg-white">
                    <span className="flex items-center gap-1 border-r border-[#d9e3f0] bg-[#f8fafc] px-2 text-sm font-semibold text-[#071d3a]">
                      <span>IN</span>
                      <span>+91</span>
                      <ChevronDown className="h-3 w-3 text-[#4d6380]" />
                    </span>
                    <input
                      ref={phoneRef}
                      data-apply-control
                      type="text"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(digitsOnly(e.target.value).slice(0, 10))}
                      placeholder="9976237656"
                      className="min-w-0 flex-1 px-3 text-sm font-semibold text-[#071d3a] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-[#071d3a]">
                    Email <span className="text-red-500">*</span>
                  </label>

                  <input
                    ref={emailRef}
                    data-apply-control
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="test@gmail.com"
                    className="mt-3 h-[54px] w-full rounded-lg border border-[#d8c5ff] bg-[#fff] px-4 text-sm font-semibold text-[#071d3a] outline-none focus:border-[#8048e2]"
                  />
                </div>


              </div>

              <label className="mt-5 flex items-start gap-3 text-sm font-medium leading-6 text-[#52657d]">
                <input
                  ref={agreeRef}
                  data-apply-control
                  type="checkbox"
                  autoComplete="off"
                  checked={agree}
                  onChange={() => setAgree(!agree)}
                  className="mt-1 h-4 w-4 rounded border-[#b9c8dc] accent-[#8048e2]"
                />
                <span>
                  I agree to the{" "}
                  <span className="font-semibold text-[#155ed0]">Terms</span>,{" "}
                  <span className="font-semibold text-[#155ed0]">Privacy Policy</span>,
                  KYC checks, and OTP verification.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-7 h-12 w-full rounded-lg bg-gradient-to-r from-[#8048e2] to-[#bd56e4] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.22)] transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Apply;
