import { describe, expect, it } from "vitest";
import { HIGH_CONFIDENCE, resolveAttempts } from "@/features/ocr/run-ocr-pipeline";
import type { OcrResult } from "@/features/ocr/types";

/**
 * Estes testes exercitam apenas `resolveAttempts` (a lógica pura de
 * seleção/parada antecipada/capeamento de confiança), sem passar pela
 * orquestração assíncrona real (`runOcrPipelineWithVariants`), que
 * depende de decodificação de imagem via `<canvas>` — indisponível no
 * jsdom da suíte unitária (mesma separação já usada pelos testes do
 * leitor de 7 segmentos, ver `tests/integration/`).
 */
function makeResult(overrides: Partial<OcrResult>): OcrResult {
  return { value: null, confidence: 0, candidates: [], engineVersion: "test", ...overrides };
}

describe("resolveAttempts", () => {
  it("para na primeira tentativa quando já atinge alta confiança", () => {
    const { result, usedCount } = resolveAttempts([
      makeResult({ value: 120, confidence: HIGH_CONFIDENCE }),
      makeResult({ value: 999, confidence: 0.99 }),
    ]);

    expect(usedCount).toBe(1);
    expect(result.value).toBe(120);
  });

  it("testa todas as variantes quando nenhuma atinge alta confiança, e fica com a melhor", () => {
    const { result, usedCount } = resolveAttempts([
      makeResult({ value: 110, confidence: 0.4 }),
      makeResult({ value: 120, confidence: 0.6 }),
      makeResult({ value: 90, confidence: 0.3 }),
    ]);

    expect(usedCount).toBe(3);
    expect(result.value).toBe(120);
    expect(result.confidence).toBe(0.6);
  });

  it("capeia a confiança quando o valor vencedor não é corroborado por outra variante", () => {
    const { result } = resolveAttempts([
      makeResult({ value: 110, confidence: 0.4 }),
      makeResult({ value: 250, confidence: 0.8 }),
      makeResult({ value: 90, confidence: 0.3 }),
    ]);

    expect(result.value).toBe(250);
    expect(result.confidence).toBeLessThan(0.7);
  });

  it("mantém a confiança original quando pelo menos duas variantes concordam", () => {
    const { result } = resolveAttempts([
      makeResult({ value: 110, confidence: 0.4 }),
      makeResult({ value: 120, confidence: 0.6 }),
      makeResult({ value: 120, confidence: 0.5 }),
    ]);

    expect(result.value).toBe(120);
    expect(result.confidence).toBe(0.6);
  });

  it("não capeia quando só uma variante rodou (parou cedo)", () => {
    const { result, usedCount } = resolveAttempts([
      makeResult({ value: 130, confidence: HIGH_CONFIDENCE }),
    ]);

    expect(usedCount).toBe(1);
    expect(result.confidence).toBe(HIGH_CONFIDENCE);
  });

  it("prefere o valor em que mais variantes concordam a uma leitura isolada mais confiante", () => {
    const { result } = resolveAttempts([
      makeResult({ value: 170, confidence: 0.7 }),
      makeResult({ value: 120, confidence: 0.5 }),
      makeResult({ value: 120, confidence: 0.45 }),
    ]);

    expect(result.value).toBe(120);
    expect(result.confidence).toBe(0.5);
    expect(result.candidates).toContain(170);
  });

  it("ignora tentativas sem valor na votação", () => {
    const { result } = resolveAttempts([
      makeResult({ value: null, confidence: 0.9 }),
      makeResult({ value: 88, confidence: 0.4 }),
    ]);

    expect(result.value).toBe(88);
  });

  it("retorna resultado vazio sem nenhuma tentativa", () => {
    const { result, usedCount } = resolveAttempts([]);
    expect(usedCount).toBe(0);
    expect(result.value).toBeNull();
  });
});
