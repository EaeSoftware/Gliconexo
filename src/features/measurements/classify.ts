export type RangeClassification = "abaixo" | "dentro" | "acima";

export const RANGE_CLASSIFICATION_LABELS: Record<RangeClassification, string> = {
  abaixo: "Abaixo da faixa configurada",
  dentro: "Dentro da faixa configurada",
  acima: "Acima da faixa configurada",
};

export type TargetRange = {
  targetMinMgDl?: number;
  targetMaxMgDl?: number;
};

/**
 * Classifica um valor em relação à faixa pessoal configurada pelo
 * usuário. Retorna `null` quando a faixa não está configurada — nesse
 * caso a interface não deve classificar nada (CLAUDE.md, seção 17,
 * regra 8). Isso é informação, não diagnóstico: a faixa é uma
 * preferência do usuário, não uma prescrição do aplicativo.
 */
export function classifyValue(
  value: number,
  range: TargetRange | null | undefined,
): RangeClassification | null {
  if (!range || range.targetMinMgDl == null || range.targetMaxMgDl == null) {
    return null;
  }
  if (value < range.targetMinMgDl) return "abaixo";
  if (value > range.targetMaxMgDl) return "acima";
  return "dentro";
}
