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
