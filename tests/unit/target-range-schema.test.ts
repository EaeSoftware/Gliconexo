import { describe, expect, it } from "vitest";
import { targetRangeSchema, parseOptionalRangeFieldValue } from "@/features/preferences/schemas";

describe("targetRangeSchema", () => {
  it("aceita os dois valores em branco", () => {
    const result = targetRangeSchema.safeParse({
      targetMinMgDl: undefined,
      targetMaxMgDl: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("aceita um par válido com mínimo menor que o máximo", () => {
    const result = targetRangeSchema.safeParse({ targetMinMgDl: 70, targetMaxMgDl: 180 });
    expect(result.success).toBe(true);
  });

  it("rejeita quando apenas um dos dois valores é informado", () => {
    const onlyMin = targetRangeSchema.safeParse({ targetMinMgDl: 70, targetMaxMgDl: undefined });
    const onlyMax = targetRangeSchema.safeParse({ targetMinMgDl: undefined, targetMaxMgDl: 180 });
    expect(onlyMin.success).toBe(false);
    expect(onlyMax.success).toBe(false);
  });

  it("rejeita quando o mínimo não é menor que o máximo", () => {
    const equal = targetRangeSchema.safeParse({ targetMinMgDl: 100, targetMaxMgDl: 100 });
    const inverted = targetRangeSchema.safeParse({ targetMinMgDl: 180, targetMaxMgDl: 70 });
    expect(equal.success).toBe(false);
    expect(inverted.success).toBe(false);
  });

  it("rejeita valores fora do intervalo 1-999", () => {
    const result = targetRangeSchema.safeParse({ targetMinMgDl: 0, targetMaxMgDl: 180 });
    expect(result.success).toBe(false);
  });
});

describe("parseOptionalRangeFieldValue", () => {
  it("converte string vazia em undefined", () => {
    expect(parseOptionalRangeFieldValue("")).toBeUndefined();
  });

  it("converte string numérica em número", () => {
    expect(parseOptionalRangeFieldValue("70")).toBe(70);
  });

  it("converte entrada inválida em undefined", () => {
    expect(parseOptionalRangeFieldValue("abc")).toBeUndefined();
  });
});
