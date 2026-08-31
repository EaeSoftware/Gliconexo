import { describe, expect, it } from "vitest";
import { measurementSchema } from "@/features/measurements/schemas";

const validInput = {
  valueMgDl: 110,
  measuredAt: "2026-08-28T08:30",
  context: "cafe_da_manha" as const,
  mealRelation: "depois" as const,
};

describe("measurementSchema", () => {
  it("aceita um valor válido dentro dos limites", () => {
    const result = measurementSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejeita valores abaixo de 1 mg/dL", () => {
    const result = measurementSchema.safeParse({ ...validInput, valueMgDl: 0 });
    expect(result.success).toBe(false);
  });

  it("rejeita valores acima de 999 mg/dL", () => {
    const result = measurementSchema.safeParse({ ...validInput, valueMgDl: 1000 });
    expect(result.success).toBe(false);
  });

  it("rejeita valores não inteiros", () => {
    const result = measurementSchema.safeParse({ ...validInput, valueMgDl: 110.5 });
    expect(result.success).toBe(false);
  });

  it("rejeita contexto fora da lista suportada", () => {
    const result = measurementSchema.safeParse({ ...validInput, context: "sobremesa" });
    expect(result.success).toBe(false);
  });

  it("rejeita observação com mais de 1000 caracteres", () => {
    const result = measurementSchema.safeParse({
      ...validInput,
      notes: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});
