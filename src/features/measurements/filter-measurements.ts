import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import type { MeasurementContext } from "@/features/measurements/constants";
import { classifyValue, type RangeClassification, type TargetRange } from "@/features/measurements/classify";

export type PeriodFilter = 7 | 30 | 90 | "all" | "custom";
export type ContextFilter = MeasurementContext | "all";
export type OriginFilter = "manual" | "ocr" | "all";
export type RangeFilter = RangeClassification | "all";

export type MeasurementListFilters = {
  period: PeriodFilter;
  /** Usado apenas quando `period === "custom"`, formato `YYYY-MM-DD`. */
  customFrom?: string;
  /** Usado apenas quando `period === "custom"`, formato `YYYY-MM-DD`. */
  customTo?: string;
  context: ContextFilter;
  origin: OriginFilter;
  /** Só tem efeito quando uma faixa pessoal está configurada. */
  range: RangeFilter;
};

export const DEFAULT_MEASUREMENT_FILTERS: MeasurementListFilters = {
  period: 7,
  context: "all",
  origin: "all",
  range: "all",
};

/**
 * Filtra medições por período/contexto/origem/faixa. O filtro de faixa
 * (abaixo/dentro/acima) só tem efeito quando `targetRange` é informado
 * — sem uma faixa pessoal configurada, não há como classificar
 * (CLAUDE.md, seção 17, regra 8).
 */
export function filterMeasurements(
  measurements: GlucoseMeasurement[],
  filters: MeasurementListFilters,
  now: Date = new Date(),
  targetRange?: TargetRange | null,
): GlucoseMeasurement[] {
  return measurements.filter((measurement) => {
    const measuredAt = new Date(measurement.measuredAt);

    if (typeof filters.period === "number") {
      const cutoff = new Date(now.getTime() - filters.period * 24 * 60 * 60 * 1000);
      if (measuredAt < cutoff) return false;
    } else if (filters.period === "custom") {
      if (filters.customFrom && measuredAt < new Date(`${filters.customFrom}T00:00:00`)) {
        return false;
      }
      if (filters.customTo && measuredAt > new Date(`${filters.customTo}T23:59:59.999`)) {
        return false;
      }
    }

    if (filters.context !== "all" && measurement.context !== filters.context) return false;
    if (filters.origin !== "all" && measurement.source !== filters.origin) return false;
    if (filters.range !== "all") {
      if (classifyValue(measurement.valueMgDl, targetRange) !== filters.range) return false;
    }
    return true;
  });
}

export type MeasurementDayGroup = {
  dateKey: string;
  label: string;
  measurements: GlucoseMeasurement[];
};

/**
 * Agrupa medições por dia (ordem decrescente), no fuso horário local do
 * dispositivo — usado pela tela de histórico (CLAUDE.md, seção 10.9).
 */
export function groupMeasurementsByDay(
  measurements: GlucoseMeasurement[],
): MeasurementDayGroup[] {
  const groups = new Map<string, GlucoseMeasurement[]>();

  for (const measurement of measurements) {
    const date = new Date(measurement.measuredAt);
    const dateKey = new Intl.DateTimeFormat("sv-SE").format(date); // YYYY-MM-DD estável
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(measurement);
    } else {
      groups.set(dateKey, [measurement]);
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([dateKey, items]) => ({
      dateKey,
      label: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(items[0].measuredAt)),
      measurements: items,
    }));
}
