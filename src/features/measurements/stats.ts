import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";

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
