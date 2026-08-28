import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import { classifyValue, type TargetRange } from "@/features/measurements/classify";

export type MeasurementStats = {
  count: number;
  average: number | null;
  min: number | null;
  max: number | null;
  last: GlucoseMeasurement | null;
};

/**
 * Estatísticas simples de um conjunto de medições já confirmadas e não
 * excluídas. Não projeta tendência, não classifica por faixa (isso exige
 * uma faixa pessoal configurada) e não interpola dias sem dados —
 * CLAUDE.md, seção 17, regras 5 e 9.
 */
export function computeMeasurementStats(measurements: GlucoseMeasurement[]): MeasurementStats {
  if (measurements.length === 0) {
    return { count: 0, average: null, min: null, max: null, last: null };
  }

  const values = measurements.map((m) => m.valueMgDl);
  const sum = values.reduce((total, value) => total + value, 0);
  const last = [...measurements].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  )[0];

  return {
    count: measurements.length,
    average: Math.round((sum / values.length) * 10) / 10,
    min: Math.min(...values),
    max: Math.max(...values),
    last,
  };
}

export type RangeDistribution = {
  belowPct: number;
  withinPct: number;
  abovePct: number;
};

/**
 * Percentual de medições abaixo/dentro/acima da faixa pessoal
 * configurada. Retorna `null` quando não há faixa configurada, ou
 * quando não há medições — a faixa é uma preferência informativa do
 * usuário, nunca inventada pelo aplicativo (CLAUDE.md, seção 17, regra 8).
 */
export function computeRangeDistribution(
  measurements: GlucoseMeasurement[],
  targetRange: TargetRange | null | undefined,
): RangeDistribution | null {
  if (!targetRange || targetRange.targetMinMgDl == null || targetRange.targetMaxMgDl == null) {
    return null;
  }
  if (measurements.length === 0) return null;

  let below = 0;
  let within = 0;
  let above = 0;

  for (const measurement of measurements) {
    const classification = classifyValue(measurement.valueMgDl, targetRange);
    if (classification === "abaixo") below += 1;
    else if (classification === "acima") above += 1;
    else within += 1;
  }

  const total = measurements.length;
  return {
    belowPct: Math.round((below / total) * 100),
    withinPct: Math.round((within / total) * 100),
    abovePct: Math.round((above / total) * 100),
  };
}
