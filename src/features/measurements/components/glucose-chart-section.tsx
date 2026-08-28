"use client";

import dynamic from "next/dynamic";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import type { TargetRange } from "@/features/measurements/classify";
import { MEASUREMENT_CONTEXT_LABELS } from "@/features/measurements/constants";

const GlucoseLineChart = dynamic(
  () => import("@/features/measurements/components/glucose-line-chart"),
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

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type GlucoseChartSectionProps = {
  measurements: GlucoseMeasurement[];
  targetRange: TargetRange | null;
};

export function GlucoseChartSection({ measurements, targetRange }: GlucoseChartSectionProps) {
  const sorted = [...measurements].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );

  return (
    <section aria-labelledby="glucose-chart-heading" className="rounded-2xl border border-border bg-surface p-4">
      <h2 id="glucose-chart-heading" className="mb-3 text-sm font-semibold text-foreground">
        Glicemia ao longo do tempo
      </h2>
      <GlucoseLineChart measurements={measurements} targetRange={targetRange} />
      <p className="mt-2 text-xs text-foreground/50">
        Dias sem registro não são preenchidos. Nenhuma tendência futura é
        projetada.
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand-blue">
          Ver tabela de dados (alternativa ao gráfico)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Medições de glicemia usadas no gráfico, mais recentes primeiro
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
                  <td className="py-1.5 pr-3 text-foreground">
                    {formatDateTime(measurement.measuredAt)}
                  </td>
                  <td className="py-1.5 pr-3 text-foreground">{measurement.valueMgDl} mg/dL</td>
                  <td className="py-1.5 text-foreground">
                    {MEASUREMENT_CONTEXT_LABELS[measurement.context]}
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
