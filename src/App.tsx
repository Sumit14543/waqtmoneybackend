import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "./Components/ui/sonner";
import { Toaster } from "./Components/ui/toaster";
import { TooltipProvider } from "@/Components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Services from "./pages/Services.tsx";
import About from "./pages/About-us.tsx";
import Faqs from "./pages/Faqs.tsx";
import Contact from "./pages/Contact.tsx";
import Policies from "./pages/Policies.tsx";
import EmiCalculator from "./pages/Emi-Calculator.tsx";
import Login from "./User/Login.tsx";
import LoanDashboard from "./User/LoanDashboard.tsx";
import Apply from "./User/Apply.tsx";
import MobileOtp from "./User/MobileOtp.tsx";
import LoanForm from "./User/LoanForm.tsx";
import BasicDetailsForm from "./User/BasicDetailsForm.tsx";
import PanVerification from "./User/PanVerification.tsx";
import KycAadhaar from "./User/KycAadhaar.tsx";
import CompanyDetails from "./User/CompanyDetails.tsx";
import BankDetails from "./User/BankDetails.tsx";
import References from "./User/References.tsx";
import SalarySlip from "./User/SalarySlip.tsx";
import CustomerVideoKYC from "./User/CustomerVideoKYC.tsx";
import LoanStatus from "./User/LoanStatus.tsx";
import PrivacyPolicy from "./pages/Privacy-Policies.tsx";
import TermsConditions from "./pages/Term-Conditions.tsx";
import GrievanceRedressal from "./pages/Grievance-Redressal.tsx";
import FairPracticesCode from "./pages/Fair-Practices.tsx";
import Repayment from "./pages/Repayment.tsx";
import MakePayment from "./pages/MakePayment.tsx";
import ReloanOffer from "./pages/ReloanOffer.tsx";
import ScrollToTop from "./Components/ScrollToTop.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/services" element={<Services/>} />
          <Route path="/About" element={<About/>} />
          <Route path="/Faqs" element={<Faqs/>} />
          <Route path="/Emi-Calculator" element={<EmiCalculator />} />
          <Route path="/Contact" element={<Contact/>} />
          <Route path="/Policies" element={<Policies/>} />
          <Route path="/Repayment" element={<Repayment />} />
          <Route path="/repayment/make-payment" element={<MakePayment />} />
          <Route path="/repayment/reloan-offer" element={<ReloanOffer />} />
          <Route path="/policies" element={<Policies/>} />
          <Route path="/privacy-policy" element={<Policies/>} />

          <Route path="/login" element={<Login />} />
          <Route path="/user/dashboard" element={<LoanDashboard />} />

            {/* USER FLOW */}
            <Route path="/user/apply" element={<Apply />} />
            <Route path="/user/otp" element={<MobileOtp />} />
            <Route path="/user/loan" element={<LoanForm />} />
            <Route path="/user/basic-details" element={<BasicDetailsForm/>} />

            {/* KYC FLOW */}
            <Route path="/user/pan-verification" element={<PanVerification />} />
            <Route path="/user/kyc-aadhaar" element={<KycAadhaar />} />
            <Route path="/user/work-details" element={<CompanyDetails/>} />
            <Route path="/user/company-details" element={<CompanyDetails/>} />
            <Route path="/user/bank-details" element={<BankDetails />} />
            <Route path="/user/references" element={<References />} />
            <Route path="/user/salary-slip" element={<SalarySlip />} />
            <Route path="/user/customer-video-kyc" element={<CustomerVideoKYC />} />

            {/* FINAL STATUS */}
            <Route path="/user/loan-status" element={<LoanStatus />} />
            <Route path="*" element={<NotFound />} />

            <Route path="/Privacy-Policies"  element={<PrivacyPolicy/>}/>
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/grievance-redressal" element={<GrievanceRedressal />} />
            <Route path="/fair-practices-code" element={<FairPracticesCode />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
