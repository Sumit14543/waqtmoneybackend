import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "./Components/ui/sonner";
import { Toaster } from "./Components/ui/toaster";
import { TooltipProvider } from "@/Components/ui/tooltip";
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
  <div className="min-h-screen bg-background pt-24">
    <div className="mx-auto h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full w-1/2 animate-pulse rounded-full bg-purple-600" />
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
