import Navbar from "@/Components/Navbar";
import HeroSection from "@/Components/HeroSection";
import FeaturesSection from "@/Components/FeaturesSection";
import LoanProductsSection from "@/Components/LoanProductsSection";
import StorySection from "@/Components/StorySection";
import StepsSection from "@/Components/StepsSection";
import EligibilitySection from "@/Components/EligibilitySection";
import TestimonialsSection from "@/Components/TestimonialsSection";
import TrustSection from "@/Components/TrustSection";
import FAQSection from "@/Components/FAQSection";
import CTASection from "@/Components/CTASection";
import Footer from "@/Components/Footer";
import LoanCalculator from "@/Components/LoanCalculator";
import BorrowSection from "@/Components/BorrowSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
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
      
      <Footer />
    </div>
  );
};

export default Index;
