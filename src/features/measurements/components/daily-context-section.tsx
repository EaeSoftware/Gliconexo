"use client";

import dynamic from "next/dynamic";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import { buildDailyContextCounts } from "@/features/measurements/chart-data";
import { CONTEXT_BUCKETS, CONTEXT_BUCKET_LABELS } from "@/features/measurements/context-buckets";
import { ContextBucketLegend } from "@/features/measurements/components/context-bucket-legend";

const DailyContextChart = dynamic(
  () => import("@/features/measurements/components/daily-context-chart"),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-live="polite"
        className="flex h-[260px] items-center justify-center text-sm text-foreground/50"
      >
        Carregando gráfico...
      </div>
    ),
  },
);

type DailyContextSectionProps = {
  measurements: GlucoseMeasurement[];
};

export function DailyContextSection({ measurements }: DailyContextSectionProps) {
  const counts = buildDailyContextCounts(measurements);

  return (
    <section aria-labelledby="daily-context-heading" className="rounded-2xl border border-border bg-surface p-4">
      <h2 id="daily-context-heading" className="mb-3 text-sm font-semibold text-foreground">
        Medições por dia e contexto
      </h2>

      <DailyContextChart measurements={measurements} />
      <ContextBucketLegend />

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand-blue">
          Ver tabela de dados (alternativa ao gráfico)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Quantidade de medições por dia e contexto</caption>
            <thead>
              <tr className="text-foreground/50">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Dia
                </th>
                {CONTEXT_BUCKETS.map((bucket) => (
                  <th key={bucket} scope="col" className="py-1 pr-3 font-medium">
                    {CONTEXT_BUCKET_LABELS[bucket]}
                  </th>
                ))}
                <th scope="col" className="py-1 font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {[...counts].reverse().map((day) => (
                <tr key={day.dateKey} className="border-t border-border">
                  <td className="py-1.5 pr-3 text-foreground">{day.label}</td>
                  {CONTEXT_BUCKETS.map((bucket) => (
                    <td key={bucket} className="py-1.5 pr-3 text-foreground">
                      {day[bucket]}
                    </td>
                  ))}
                  <td className="py-1.5 text-foreground">
                    {CONTEXT_BUCKETS.reduce((total, bucket) => total + day[bucket], 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
