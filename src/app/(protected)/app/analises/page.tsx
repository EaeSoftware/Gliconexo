import type { Metadata } from "next";
import { AnalyticsSummary } from "@/features/measurements/components/analytics-summary";

export const metadata: Metadata = { title: "Análises" };

export default function AnalisesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Análises</h1>
      <AnalyticsSummary />
    </div>
  );
}
