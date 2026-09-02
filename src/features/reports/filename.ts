import type { PeriodFilter } from "@/features/measurements/filter-measurements";

export function periodFilenamePart(period: PeriodFilter): string {
  if (period === "all") return "tudo";
  return `${period}dias`;
}
