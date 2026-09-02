import { MAX_VALUE, MIN_VALUE } from "@/features/ocr/parse-candidates";
import type { DecodedDigit } from "@/features/ocr/seven-segment/types";

export const MAX_READING_DIGIT_COUNT = 3;

/**
 * Valida uma sequência de dígitos decodificados (esquerda para
 * direita) e monta o valor final. Rejeita (retorna `value: null`) se
 * qualquer dígito for ambíguo, se a contagem de dígitos for inválida,
 * ou se o número resultante estiver fora de 1-999 — nunca "chuta"
 * (CLAUDE.md, "NÃO tente adivinhar números").
 */
export function validateDecodedNumber(digits: DecodedDigit[]): { value: number | null; confidence: number } {
  if (digits.length === 0 || digits.length > MAX_READING_DIGIT_COUNT) {
    return { value: null, confidence: 0 };
  }

  if (digits.some((digit) => digit.char === null)) {
    return { value: null, confidence: 0 };
  }

  const value = Number(digits.map((digit) => digit.char).join(""));
  if (!Number.isInteger(value) || value < MIN_VALUE || value > MAX_VALUE) {
    return { value: null, confidence: 0 };
  }

  const confidence = digits.reduce((sum, digit) => sum + digit.confidence, 0) / digits.length;
  return { value, confidence };
}
