import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "./Components/ui/sonner";
import { Toaster } from "./Components/ui/toaster";
import { TooltipProvider } from "@/Components/ui/tooltip";
import EnterKeyFocusHandler from "./Components/EnterKeyFocusHandler.tsx";
import ScrollToTop from "./Components/ScrollToTop.tsx";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Services = lazy(() => import("./pages/Services.tsx"));
const About = lazy(() => import("./pages/About-us.tsx"));
const Faqs = lazy(() => import("./pages/Faqs.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Policies = lazy(() => import("./pages/Policies.tsx"));
const EmiCalculator = lazy(() => import("./pages/Emi-Calculator.tsx"));
const Login = lazy(() => import("./User/Login.tsx"));
const LoanDashboard = lazy(() => import("./User/LoanDashboard.tsx"));
const Apply = lazy(() => import("./User/Apply.tsx"));
const MobileOtp = lazy(() => import("./User/MobileOtp.tsx"));
const LoanForm = lazy(() => import("./User/LoanForm.tsx"));
const BasicDetailsForm = lazy(() => import("./User/BasicDetailsForm.tsx"));
const PanVerification = lazy(() => import("./User/PanVerification.tsx"));
const KycAadhaar = lazy(() => import("./User/KycAadhaar.tsx"));
const CompanyDetails = lazy(() => import("./User/CompanyDetails.tsx"));
const BankDetails = lazy(() => import("./User/BankDetails.tsx"));
const References = lazy(() => import("./User/References.tsx"));
const SalarySlip = lazy(() => import("./User/SalarySlip.tsx"));
const CustomerVideoKYC = lazy(() => import("./User/CustomerVideoKYC.tsx"));
const LoanStatus = lazy(() => import("./User/LoanStatus.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/Privacy-Policies.tsx"));
const TermsConditions = lazy(() => import("./pages/Term-Conditions.tsx"));
const GrievanceRedressal = lazy(() => import("./pages/Grievance-Redressal.tsx"));
const FairPracticesCode = lazy(() => import("./pages/Fair-Practices.tsx"));
const Repayment = lazy(() => import("./pages/Repayment.tsx"));
const MakePayment = lazy(() => import("./pages/MakePayment.tsx"));
const ReloanOffer = lazy(() => import("./pages/ReloanOffer.tsx"));

const PageFallback = () => (
  <div className="page-loader-screen min-h-screen bg-[linear-gradient(180deg,#f7f3ff_0%,#fbfaff_45%,#fffaf3_100%)] px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="skeleton-block h-11 w-36 rounded-2xl shadow-sm ring-1 ring-purple-100/70 sm:w-44" />
        </div>
        <div className="hidden items-center gap-5 md:flex">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="skeleton-block h-3 w-16 rounded-full" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden h-9 w-16 rounded-full sm:block skeleton-block" />
          <div className="skeleton-block h-10 w-24 rounded-full" />
        </div>
      </div>

      <section className="grid items-center gap-8 pb-10 pt-7 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:pb-12 lg:pt-12">
        <div className="text-center lg:text-left">
          <div className="mx-auto h-8 w-44 rounded-full lg:mx-0 skeleton-block" />
          <div className="mx-auto mt-6 max-w-2xl lg:mx-0">
            <div className="skeleton-block mx-auto h-12 w-[92%] rounded-full lg:mx-0" />
            <div className="skeleton-block mx-auto mt-4 h-12 w-[76%] rounded-full lg:mx-0" />
            <div className="skeleton-block mx-auto mt-4 h-12 w-[58%] rounded-full lg:mx-0" />
          </div>
          <div className="mx-auto mt-7 max-w-xl lg:mx-0">
            <div className="skeleton-block h-4 w-full rounded-full" />
            <div className="skeleton-block mt-3 h-4 w-[78%] rounded-full" />
          </div>

          <div className="mx-auto mt-8 flex w-full max-w-md items-center gap-2 rounded-full border border-purple-100 bg-white p-2 shadow-md lg:mx-0">
            <div className="skeleton-block h-11 flex-1 rounded-full" />
            <div className="skeleton-block h-11 w-32 rounded-full bg-purple-200" />
          </div>

          <div className="mx-auto mt-8 grid max-w-xl gap-5 sm:grid-cols-2 lg:mx-0">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="skeleton-block h-11 w-11 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="skeleton-block h-4 w-[80%] rounded-full" />
                  <div className="skeleton-block mt-2 h-3 w-[58%] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px]">
          <div className="absolute -inset-4 rounded-[36px] bg-purple-100/60 blur-3xl" />
          <div className="relative rounded-[32px] bg-white/80 p-3 shadow-[0_28px_90px_rgba(91,33,182,0.16)]">
            <div className="skeleton-block aspect-[5/4] w-full rounded-[28px]" />
            <div className="absolute right-7 top-14 hidden rounded-2xl bg-white p-4 shadow-xl sm:block">
              <div className="skeleton-block h-7 w-24 rounded-full" />
              <div className="skeleton-block mt-2 h-3 w-20 rounded-full" />
            </div>
            <div className="absolute bottom-8 left-7 hidden rounded-2xl bg-purple-600 p-4 shadow-xl sm:block">
              <div className="skeleton-block h-3 w-28 rounded-full bg-white/30" />
              <div className="skeleton-block mt-2 h-4 w-36 rounded-full bg-white/40" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-t border-purple-100/70 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="skeleton-block h-10 w-10 rounded-xl" />
            <div className="skeleton-block mt-5 h-5 w-32 rounded-full" />
            <div className="skeleton-block mt-3 h-3 w-full rounded-full" />
            <div className="skeleton-block mt-2 h-3 w-[72%] rounded-full" />
          </div>
        ))}
      </section>

      <section className="grid gap-5 py-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[28px] bg-slate-950 p-6">
          <div className="skeleton-block h-7 w-44 rounded-full bg-white/15" />
          <div className="mt-7 space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex gap-3">
                <div className="skeleton-block h-9 w-9 shrink-0 rounded-full bg-white/15" />
                <div className="flex-1">
                  <div className="skeleton-block h-4 w-[70%] rounded-full bg-white/15" />
                  <div className="skeleton-block mt-2 h-3 w-[48%] rounded-full bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] border border-purple-100 bg-white p-6 shadow-sm">
          <div className="skeleton-block h-7 w-56 rounded-full" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="rounded-2xl bg-purple-50/70 p-4">
                <div className="skeleton-block h-5 w-5 rounded-md" />
                <div className="skeleton-block mt-4 h-4 w-[68%] rounded-full" />
                <div className="skeleton-block mt-2 h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EnterKeyFocusHandler />
        <ScrollToTop />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/about" element={<About />} />
            <Route path="/faqs" element={<Faqs />} />
            <Route path="/emi-calculator" element={<EmiCalculator />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/repayment" element={<Repayment />} />
            <Route path="/repayment/make-payment" element={<MakePayment />} />
            <Route path="/repayment/reloan-offer" element={<ReloanOffer />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/privacy-policy" element={<Policies />} />

            <Route path="/login" element={<Login />} />
            <Route path="/user/dashboard" element={<LoanDashboard />} />

            {/* USER FLOW */}
            <Route path="/user/apply" element={<Apply />} />
            <Route path="/user/otp" element={<MobileOtp />} />
            <Route path="/user/loan" element={<LoanForm />} />
            <Route path="/user/basic-details" element={<BasicDetailsForm />} />

            {/* KYC FLOW */}
            <Route path="/user/pan-verification" element={<PanVerification />} />
            <Route path="/user/kyc-aadhaar" element={<KycAadhaar />} />
            <Route path="/user/work-details" element={<CompanyDetails />} />
            <Route path="/user/company-details" element={<CompanyDetails />} />
            <Route path="/user/bank-details" element={<BankDetails />} />
            <Route path="/user/references" element={<References />} />
            <Route path="/user/salary-slip" element={<SalarySlip />} />
            <Route path="/user/customer-video-kyc" element={<CustomerVideoKYC />} />

            {/* FINAL STATUS */}
            <Route path="/user/loan-status" element={<LoanStatus />} />
            <Route path="*" element={<NotFound />} />

            <Route path="/privacy-policies" element={<PrivacyPolicy />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/grievance-redressal" element={<GrievanceRedressal />} />
            <Route path="/fair-practices-code" element={<FairPracticesCode />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
