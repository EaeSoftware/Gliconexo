/**
 * Extrai candidatos numéricos plausíveis (1–999, mesmo intervalo válido
 * de `value_mg_dl`) de um texto bruto reconhecido por OCR. Números fora
 * da faixa, ou texto sem nenhum dígito, não geram candidatos —
 * CLAUDE.md, seção 19 ("parser de candidatos do OCR", "rejeicao de
 * texto sem numero").
 */
export function parseNumericCandidates(rawText: string): number[] {
  const matches = rawText.match(/\d+/g) ?? [];
  const numbers = matches
    .map((match) => Number(match))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 999);
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
