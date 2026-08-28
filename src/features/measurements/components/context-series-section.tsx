"use client";

import dynamic from "next/dynamic";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import { CONTEXT_BUCKET_LABELS, bucketForContext } from "@/features/measurements/context-buckets";
import { MEASUREMENT_CONTEXT_LABELS } from "@/features/measurements/constants";
import { ContextBucketLegend } from "@/features/measurements/components/context-bucket-legend";

const ContextSeriesChart = dynamic(
  () => import("@/features/measurements/components/context-series-chart"),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-live="polite"
        className="flex h-[280px] items-center justify-center text-sm text-foreground/50"
      >
        Carregando gráfico...
      </div>
    ),
  },
);

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type ContextSeriesSectionProps = {
  measurements: GlucoseMeasurement[];
};

export function ContextSeriesSection({ measurements }: ContextSeriesSectionProps) {
  const sorted = [...measurements].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );

  return (
    <section aria-labelledby="context-series-heading" className="rounded-2xl border border-border bg-surface p-4">
      <h2 id="context-series-heading" className="mb-1 text-sm font-semibold text-foreground">
        Glicemia por contexto
      </h2>
      <p className="mb-3 text-xs text-foreground/50">
        Café da manhã, almoço, lanche da tarde, jantar e outros contextos
        (jejum, madrugada, antes de dormir, atividade física e outro).
      </p>

      <ContextSeriesChart measurements={measurements} />
      <ContextBucketLegend />

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand-blue">
          Ver tabela de dados (alternativa ao gráfico)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Medições de glicemia por contexto, mais recentes primeiro
            </caption>
            <thead>
              <tr className="text-foreground/50">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Data e horário
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Valor
                </th>
                <th scope="col" className="py-1 font-medium">
                  Contexto
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((measurement) => (
                <tr key={measurement.id} className="border-t border-border">
                  <td className="py-1.5 pr-3 text-foreground">{formatDateTime(measurement.measuredAt)}</td>
                  <td className="py-1.5 pr-3 text-foreground">{measurement.valueMgDl} mg/dL</td>
                  <td className="py-1.5 text-foreground">
                    {MEASUREMENT_CONTEXT_LABELS[measurement.context]}
                    <span className="text-foreground/50">
                      {" "}
                      ({CONTEXT_BUCKET_LABELS[bucketForContext(measurement.context)]})
                    </span>
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
