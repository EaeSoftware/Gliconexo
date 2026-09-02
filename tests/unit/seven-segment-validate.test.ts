import { describe, expect, it } from "vitest";
import { validateDecodedNumber } from "@/features/ocr/seven-segment/validate-result";
import type { DecodedDigit, SegmentState } from "@/features/ocr/seven-segment/types";

const ZEROED: SegmentState = {
  top: false,
  topLeft: false,
  topRight: false,
  middle: false,
  bottomLeft: false,
  bottomRight: false,
  bottom: false,
};

function digit(char: string | null, confidence = 0.9): DecodedDigit {
  return { char, segments: ZEROED, confidence };
}

describe("validateDecodedNumber", () => {
  it("aceita um valor de 3 dígitos válido e calcula a confiança média", () => {
    const result = validateDecodedNumber([digit("1", 0.8), digit("0", 0.9), digit("3", 1)]);
    expect(result.value).toBe(103);
    expect(result.confidence).toBeCloseTo(0.9, 5);
  });

  it("aceita o limite inferior da faixa (1)", () => {
    expect(validateDecodedNumber([digit("1")]).value).toBe(1);
  });

  it("aceita o limite superior da faixa (999)", () => {
    expect(validateDecodedNumber([digit("9"), digit("9"), digit("9")]).value).toBe(999);
  });

  it("rejeita quando o valor resultante é 0", () => {
    expect(validateDecodedNumber([digit("0")]).value).toBeNull();
  });

  it("rejeita quando há mais de 3 dígitos (fora da faixa 1-999)", () => {
    const result = validateDecodedNumber([digit("1"), digit("0"), digit("0"), digit("0")]);
    expect(result.value).toBeNull();
  });

  it("rejeita lista vazia de dígitos", () => {
    expect(validateDecodedNumber([]).value).toBeNull();
  });

  it("rejeita a leitura inteira se qualquer dígito for ambíguo (null), sem recuperação parcial", () => {
    const result = validateDecodedNumber([digit("1"), digit(null), digit("3")]);
    expect(result.value).toBeNull();
    expect(result.confidence).toBe(0);
  });
});
