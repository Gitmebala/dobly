import ComparisonSection from "@/components/landing/ComparisonSection";
import FeatureCards from "@/components/landing/FeatureCards";
import FinalCTA from "@/components/landing/FinalCTA";
import HeroSection from "@/components/landing/HeroSection";
import LogoBar from "@/components/landing/LogoBar";
import PhilosophyStatement from "@/components/landing/PhilosophyStatement";
import PricingSection from "@/components/landing/PricingSection";
import StorySection from "@/components/landing/StorySection";
import TerminalDemo from "@/components/landing/TerminalDemo";
import NavBar from "@/components/shared/NavBar";

export default function HomePageExperience() {
  return (
    <div className="landing-shell relative min-h-screen">
      <NavBar />
      <main>
        <HeroSection />
        <LogoBar />
        <StorySection />
        <PhilosophyStatement />
        <TerminalDemo />
        <FeatureCards />
        <PricingSection />
        <ComparisonSection />
        <FinalCTA />
      </main>
    </div>
  );
}
