import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTABand } from "@/components/landing/CTABand";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="bg-forest">
      <LandingNav />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <ServicesSection />
      <HowItWorksSection />
      <FAQSection />
      <CTABand />
      <LandingFooter />
    </div>
  );
}
