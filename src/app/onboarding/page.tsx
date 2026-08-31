import type { Metadata } from "next";
import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";

export const metadata: Metadata = { title: "Bem-vindo" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <OnboardingFlow />
    </div>
  );
}
