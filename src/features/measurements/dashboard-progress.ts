import { MIN_MEASUREMENTS_FOR_DASHBOARD } from "@/features/measurements/constants";

export type DashboardProgress = {
  confirmedCount: number;
  remaining: number;
  isUnlocked: boolean;
};

/**
 * Regra de negócio: o dashboard completo só é liberado a partir da quarta
 * medição confirmada (CLAUDE.md, seção 17, regra 3).
 */
export function getDashboardProgress(confirmedCount: number): DashboardProgress {
  const safeCount = Math.max(0, confirmedCount);
  const remaining = Math.max(0, MIN_MEASUREMENTS_FOR_DASHBOARD - safeCount);

  return {
    confirmedCount: safeCount,
    remaining,
    isUnlocked: safeCount >= MIN_MEASUREMENTS_FOR_DASHBOARD,
  };
}
