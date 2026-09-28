import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import { bucketForContext, CONTEXT_BUCKETS, type ContextBucket } from "@/features/measurements/context-buckets";

/**
 * Um ponto por medição, com o valor colocado apenas na chave do seu
 * próprio balde de contexto (as demais ficam `undefined`) — permite ao
 * Recharts desenhar uma linha por contexto sem interpolar entre baldes
 * diferentes nem entre dias sem registro (CLAUDE.md, seção 17, regra 5).
 */
export type ContextSeriesPoint = { timestamp: number } & Partial<Record<ContextBucket, number>>;

export function buildContextSeriesPoints(measurements: GlucoseMeasurement[]): ContextSeriesPoint[] {
  return [...measurements]
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .map((measurement) => ({
      timestamp: new Date(measurement.measuredAt).getTime(),
      [bucketForContext(measurement.context)]: measurement.valueMgDl,
    }));
}

/** Uma linha por dia, com a contagem de medições em cada balde de contexto. */
export type DailyContextCount = { dateKey: string; label: string } & Record<ContextBucket, number>;

function emptyBucketCounts(): Record<ContextBucket, number> {
  return Object.fromEntries(CONTEXT_BUCKETS.map((bucket) => [bucket, 0])) as Record<ContextBucket, number>;
}

/**
 * Quantidade de medições por dia e por contexto (CLAUDE.md, seção 10.11).
 * Dias sem nenhuma medição não aparecem — não são inventados com
 * contagem zero, mantendo a regra de nunca interpolar dias sem dados.
 */
export function buildDailyContextCounts(measurements: GlucoseMeasurement[]): DailyContextCount[] {
  const groups = new Map<string, { label: string; counts: Record<ContextBucket, number> }>();

  for (const measurement of measurements) {
    const date = new Date(measurement.measuredAt);
    const dateKey = new Intl.DateTimeFormat("sv-SE").format(date);
    let group = groups.get(dateKey);
    if (!group) {
      group = {
        label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date),
        counts: emptyBucketCounts(),
      };
      groups.set(dateKey, group);
    }
    group.counts[bucketForContext(measurement.context)] += 1;
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([dateKey, group]) => ({ dateKey, label: group.label, ...group.counts }));
}

export type ChartGranularity = "day" | "week" | "month";

/** Uma média (e mínimo/máximo/contagem) por balde de dia, semana ou mês. */
export type AggregatedPoint = {
  bucketKey: string;
  label: string;
  timestamp: number;
  average: number;
  min: number;
  max: number;
  count: number;
};

type Bucket = { key: string; label: string; timestamp: number };

function dayBucket(date: Date): Bucket {
  const key = new Intl.DateTimeFormat("sv-SE").format(date);
  const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
  return { key, label, timestamp: new Date(`${key}T00:00:00`).getTime() };
}

/**
 * Semana ISO-8601 (segunda a domingo, semana 1 contém a primeira
 * quinta-feira do ano). Usa componentes de data locais do usuário (não
 * UTC) como entrada, mantendo o cálculo alinhado ao fuso horário local
 * (CLAUDE.md, seção 17, regra 6), mas a numeração ISO em si é
 * calendário-absoluta.
 */
function isoWeekBucket(date: Date): Bucket {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7; // segunda=0 ... domingo=6
  target.setUTCDate(target.getUTCDate() - dayNumber + 3); // quinta-feira da mesma semana
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86_400_000));

  const monday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  monday.setUTCDate(monday.getUTCDate() - dayNumber);

  return {
    key: `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`,
    label: `Semana de ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(monday)}`,
    timestamp: monday.getTime(),
  };
}

function monthBucket(date: Date): Bucket {
  const timestamp = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  return {
    key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    label: new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(date),
    timestamp,
  };
}

function bucketFor(date: Date, granularity: ChartGranularity): Bucket {
  if (granularity === "day") return dayBucket(date);
  if (granularity === "week") return isoWeekBucket(date);
  return monthBucket(date);
}

/**
 * Agrega medições em baldes de dia, semana ou mês, com média, mínimo,
 * máximo e contagem por balde. Baldes sem nenhuma medição nunca são
 * gerados — apenas os que realmente têm dados aparecem, preservando a
 * regra de nunca interpolar/inventar dias sem registro (CLAUDE.md,
 * seção 17, regra 5).
 */
export function buildAggregatedSeries(
  measurements: GlucoseMeasurement[],
  granularity: ChartGranularity,
): AggregatedPoint[] {
  const groups = new Map<string, { label: string; timestamp: number; values: number[] }>();

  for (const measurement of measurements) {
    const date = new Date(measurement.measuredAt);
    const bucket = bucketFor(date, granularity);
    let group = groups.get(bucket.key);
    if (!group) {
      group = { label: bucket.label, timestamp: bucket.timestamp, values: [] };
      groups.set(bucket.key, group);
    }
    group.values.push(measurement.valueMgDl);
  }

  return Array.from(groups.entries())
    .map(([bucketKey, group]) => {
      const sum = group.values.reduce((total, value) => total + value, 0);
      return {
        bucketKey,
        label: group.label,
        timestamp: group.timestamp,
        average: Math.round((sum / group.values.length) * 10) / 10,
        min: Math.min(...group.values),
        max: Math.max(...group.values),
        count: group.values.length,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}
