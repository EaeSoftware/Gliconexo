import { describe, expect, it } from "vitest";
import { getDashboardProgress } from "@/features/measurements/dashboard-progress";

describe("getDashboardProgress", () => {
  it("mantém o dashboard bloqueado com menos de quatro medições", () => {
    expect(getDashboardProgress(0)).toEqual({
      confirmedCount: 0,
      remaining: 4,
      isUnlocked: false,
    });
    expect(getDashboardProgress(3)).toEqual({
      confirmedCount: 3,
      remaining: 1,
      isUnlocked: false,
    });
  });

  it("libera o dashboard exatamente na quarta medição", () => {
    expect(getDashboardProgress(4)).toEqual({
      confirmedCount: 4,
      remaining: 0,
      isUnlocked: true,
    });
  });

  it("mantém liberado além da quarta medição", () => {
    expect(getDashboardProgress(20).isUnlocked).toBe(true);
  });

  it("não retorna valores negativos para contagens inválidas", () => {
    expect(getDashboardProgress(-5)).toEqual({
      confirmedCount: 0,
      remaining: 4,
      isUnlocked: false,
    });
  });
});
