import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "./Components/ui/sonner";
import {
  HomeFallback,
  ContentPageFallback,
  AuthPageFallback,
  KycPageFallback,
  DashboardPageFallback,
} from "./Components/PageSkeletons";
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

const withSuspense = (
  Component: React.ComponentType<any>,
  fallback: React.ReactNode
) => (
  <Suspense fallback={fallback}>
    <Component />
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EnterKeyFocusHandler />
        <ScrollToTop />
        <Routes>
          <Route path="/" element={withSuspense(Index, <HomeFallback />)} />
          <Route path="/services" element={withSuspense(Services, <ContentPageFallback />)} />
          <Route path="/about" element={withSuspense(About, <ContentPageFallback />)} />
          <Route path="/faqs" element={withSuspense(Faqs, <ContentPageFallback />)} />
          <Route path="/emi-calculator" element={withSuspense(EmiCalculator, <ContentPageFallback />)} />
          <Route path="/contact" element={withSuspense(Contact, <ContentPageFallback />)} />
          <Route path="/policies" element={withSuspense(Policies, <ContentPageFallback />)} />
          <Route path="/repayment" element={withSuspense(Repayment, <ContentPageFallback />)} />
          <Route path="/repayment/make-payment" element={withSuspense(MakePayment, <ContentPageFallback />)} />
          <Route path="/repayment/reloan-offer" element={withSuspense(ReloanOffer, <ContentPageFallback />)} />
          <Route path="/privacy-policy" element={withSuspense(Policies, <ContentPageFallback />)} />

          <Route path="/login" element={withSuspense(Login, <AuthPageFallback />)} />
          <Route path="/user/dashboard" element={withSuspense(LoanDashboard, <DashboardPageFallback />)} />

          {/* USER FLOW */}
          <Route path="/user/apply" element={withSuspense(Apply, <KycPageFallback />)} />
          <Route path="/user/otp" element={withSuspense(MobileOtp, <AuthPageFallback />)} />
          <Route path="/user/loan" element={withSuspense(LoanForm, <KycPageFallback />)} />
          <Route path="/user/basic-details" element={withSuspense(BasicDetailsForm, <KycPageFallback />)} />

          {/* KYC FLOW */}
          <Route path="/user/pan-verification" element={withSuspense(PanVerification, <KycPageFallback />)} />
          <Route path="/user/kyc-aadhaar" element={withSuspense(KycAadhaar, <KycPageFallback />)} />
          <Route path="/user/work-details" element={withSuspense(CompanyDetails, <KycPageFallback />)} />
          <Route path="/user/company-details" element={withSuspense(CompanyDetails, <KycPageFallback />)} />
          <Route path="/user/bank-details" element={withSuspense(BankDetails, <KycPageFallback />)} />
          <Route path="/user/references" element={withSuspense(References, <KycPageFallback />)} />
          <Route path="/user/salary-slip" element={withSuspense(SalarySlip, <KycPageFallback />)} />
          <Route path="/user/customer-video-kyc" element={withSuspense(CustomerVideoKYC, <KycPageFallback />)} />

          {/* FINAL STATUS */}
          <Route path="/user/loan-status" element={withSuspense(LoanStatus, <KycPageFallback />)} />
          <Route path="*" element={withSuspense(NotFound, <ContentPageFallback />)} />

          <Route path="/privacy-policies" element={withSuspense(PrivacyPolicy, <ContentPageFallback />)} />
          <Route path="/terms-conditions" element={withSuspense(TermsConditions, <ContentPageFallback />)} />
          <Route path="/grievance-redressal" element={withSuspense(GrievanceRedressal, <ContentPageFallback />)} />
          <Route path="/fair-practices-code" element={withSuspense(FairPracticesCode, <ContentPageFallback />)} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
