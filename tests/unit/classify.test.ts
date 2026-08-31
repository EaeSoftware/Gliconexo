import { describe, expect, it } from "vitest";
import { classifyValue } from "@/features/measurements/classify";

describe("classifyValue", () => {
  it("retorna null quando a faixa não está configurada", () => {
    expect(classifyValue(110, null)).toBeNull();
    expect(classifyValue(110, undefined)).toBeNull();
    expect(classifyValue(110, {})).toBeNull();
    expect(classifyValue(110, { targetMinMgDl: 70 })).toBeNull();
    expect(classifyValue(110, { targetMaxMgDl: 180 })).toBeNull();
  });

  const range = { targetMinMgDl: 70, targetMaxMgDl: 180 };

  it("classifica abaixo da faixa", () => {
    expect(classifyValue(69, range)).toBe("abaixo");
  });

  it("classifica dentro da faixa, incluindo os limites", () => {
    expect(classifyValue(70, range)).toBe("dentro");
    expect(classifyValue(125, range)).toBe("dentro");
    expect(classifyValue(180, range)).toBe("dentro");
  });

  it("classifica acima da faixa", () => {
    expect(classifyValue(181, range)).toBe("acima");
  });
});
