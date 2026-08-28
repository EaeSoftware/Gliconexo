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
 * Escolhe o candidato mais provável entre os encontrados. Hoje é
 * apenas o primeiro candidato (ordem de leitura), mas fica isolado
 * numa função própria para permitir refinar a heurística sem mexer na
 * tela de captura.
 */
export function pickBestCandidate(candidates: number[]): number | null {
  return candidates.length > 0 ? candidates[0] : null;
}
