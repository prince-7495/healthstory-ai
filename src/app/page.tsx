import ChangeDetectionPreview from "@/components/ChangeDetectionPreview";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import GlobalAccessibility from "@/components/GlobalAccessibility";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import HumanCenteredSection from "@/components/HumanCenteredSection";
import Navbar from "@/components/Navbar";
import PrivacySection from "@/components/PrivacySection";
import ProblemSection from "@/components/ProblemSection";
import SafetySection from "@/components/SafetySection";
import SolutionSection from "@/components/SolutionSection";
import TransformationSection from "@/components/TransformationSection";

/**
 * HealthStory AI — Stage 1: the public landing page.
 *
 * Narrative order is deliberate and judge-first:
 *   Hero (what it is) → Problem → Transformation (the wow moment) →
 *   Product → How it works → What Changed? (differentiator) →
 *   Languages → Human impact → Safety → Privacy → CTA
 */
export default function Page() {
  return (
    <>
      <Navbar />

      <main id="main">
        <Hero />
        <ProblemSection />
        <TransformationSection />
        <SolutionSection />
        <HowItWorks />
        <ChangeDetectionPreview />
        <GlobalAccessibility />
        <HumanCenteredSection />
        <SafetySection />
        <PrivacySection />
        <FinalCTA />
      </main>

      <Footer />
    </>
  );
}