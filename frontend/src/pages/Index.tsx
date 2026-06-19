import { lazy, Suspense } from "react";
import Navbar from "@/Components/Navbar";
import HeroSection from "@/Components/HeroSection";
import Footer from "@/Components/Footer";

const FeaturesSection = lazy(() => import("@/Components/FeaturesSection"));
const LoanProductsSection = lazy(() => import("@/Components/LoanProductsSection"));
const StorySection = lazy(() => import("@/Components/StorySection"));
const StepsSection = lazy(() => import("@/Components/StepsSection"));
const EligibilitySection = lazy(() => import("@/Components/EligibilitySection"));
const TestimonialsSection = lazy(() => import("@/Components/TestimonialsSection"));
const TrustSection = lazy(() => import("@/Components/TrustSection"));
const FAQSection = lazy(() => import("@/Components/FAQSection"));
const LoanCalculator = lazy(() => import("@/Components/LoanCalculator"));
const BorrowSection = lazy(() => import("@/Components/BorrowSection"));

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <StepsSection />
        <EligibilitySection />
        <LoanCalculator/>
        <BorrowSection/>
        <FeaturesSection />
        <LoanProductsSection />
        <StorySection />
        <TestimonialsSection />
        <TrustSection />
        <FAQSection />
      </Suspense>
      
      <Footer />
    </div>
  );
};

export default Index;
