/** Faixa válida de `value_mg_dl` (CLAUDE.md, seção 11.3). Compartilhada por todos os providers de OCR. */
export const MIN_VALUE = 1;
export const MAX_VALUE = 999;

/**
 * Letras que um OCR de texto genérico costuma "ver" no lugar de dígitos
 * de 7 segmentos (ex.: PaddleOCR lendo o relógio "1:54" como "1S").
 */
const LOOKALIKE_DIGITS: Record<string, string> = {
  O: "0",
  o: "0",
  D: "0",
  Q: "0",
  I: "1",
  l: "1",
  "|": "1",
  "!": "1",
  Z: "2",
  z: "2",
  S: "5",
  s: "5",
  G: "6",
  b: "6",
  T: "7",
  B: "8",
  g: "9",
  q: "9",
};

/**
 * Troca letras parecidas por dígitos, mas só dentro de trechos que já
 * contêm pelo menos um dígito real — assim "1O3" vira "103" e "1S" vira
 * "15", enquanto palavras como "mg/dL" ou "Accu-CHEK" ficam intactas e
 * nunca geram um número inventado.
 */
export function normalizeLookalikeDigits(rawText: string): string {
  return rawText.replace(/[0-9OoDQIl|!ZzSsGbTBgq]+/g, (token) =>
    /\d/.test(token) ? token.replace(/[^0-9]/g, (char) => LOOKALIKE_DIGITS[char] ?? char) : token,
  );
}

/**
 * Visores de 7 segmentos têm vãos largos entre dígitos, e o OCR às vezes
 * devolve "1 03" em vez de "103". Se o texto for só grupos de dígitos
 * separados por espaço e, juntos, formarem um valor de 2 a 3 dígitos
 * dentro da faixa, devolve esse valor. Separadores como ":" (relógio)
 * nunca são juntados.
 */
export function joinSplitDigitGroups(rawText: string): number | null {
  const text = normalizeLookalikeDigits(rawText).trim();
  if (!/^\d+(\s+\d+)+$/.test(text)) return null;
  const joined = text.replace(/\s+/g, "");
  if (joined.length < 2 || joined.length > 3) return null;
  const value = Number(joined);
  return value >= MIN_VALUE && value <= MAX_VALUE ? value : null;
}

/**
 * Extrai candidatos numéricos plausíveis (1–999, mesmo intervalo válido
 * de `value_mg_dl`) de um texto bruto reconhecido por OCR. Números fora
 * da faixa, ou texto sem nenhum dígito, não geram candidatos —
 * CLAUDE.md, seção 19 ("parser de candidatos do OCR", "rejeicao de
 * texto sem numero").
 */
export function parseNumericCandidates(rawText: string): number[] {
  const matches = normalizeLookalikeDigits(rawText).match(/\d+/g) ?? [];
  const numbers = matches
    .map((match) => Number(match))
    .filter((value) => Number.isInteger(value) && value >= MIN_VALUE && value <= MAX_VALUE);
  return Array.from(new Set(numbers));
}

/**
 * Escolhe o candidato mais provável entre os encontrados. O visor do
 * glicosímetro mostra o valor com 2 ou 3 dígitos; ruído do OCR (traços,
 * pontos, bordas do visor) costuma virar dígitos avulsos de 1 dígito
 * antes ou depois do número real. Por isso prioriza o candidato com
 * mais dígitos, e só usa a ordem de leitura como desempate.
 */
export function pickBestCandidate(candidates: number[]): number | null {
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestDigitCount = String(best).length;
  for (const candidate of candidates.slice(1)) {
    const digitCount = String(candidate).length;
    if (digitCount > bestDigitCount) {
      best = candidate;
      bestDigitCount = digitCount;
    }
  }
  return best;
}
