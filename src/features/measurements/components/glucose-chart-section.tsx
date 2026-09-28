"use client";

import dynamic from "next/dynamic";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import type { TargetRange } from "@/features/measurements/classify";
import { RANGE_CLASSIFICATION_LABELS } from "@/features/measurements/classify";
import { buildAggregatedSeries, type ChartGranularity } from "@/features/measurements/chart-data";
import type { ChartType } from "@/features/measurements/components/chart-type-switcher";
import type { RangeDistribution } from "@/features/measurements/stats";

const LOADING_FALLBACK = (
  <div
    role="status"
    aria-live="polite"
    className="flex h-[260px] items-center justify-center text-sm text-foreground/50"
  >
    Carregando gráfico...
  </div>
);

const GlucoseAggregatedChart = dynamic(
  () => import("@/features/measurements/components/glucose-aggregated-chart"),
  { ssr: false, loading: () => LOADING_FALLBACK },
);

const GlucosePieChart = dynamic(
  () => import("@/features/measurements/components/glucose-pie-chart"),
  { ssr: false, loading: () => LOADING_FALLBACK },
);

const GRANULARITY_LABEL: Record<ChartGranularity, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
};

type GlucoseChartSectionProps = {
  measurements: GlucoseMeasurement[];
  targetRange: TargetRange | null;
  chartType: ChartType;
  granularity: ChartGranularity;
  distribution: RangeDistribution | null;
};

export function GlucoseChartSection({
  measurements,
  targetRange,
  chartType,
  granularity,
  distribution,
}: GlucoseChartSectionProps) {
  if (chartType === "pie") {
    return (
      <section aria-labelledby="glucose-chart-heading" className="rounded-2xl border border-border bg-surface p-4">
        <h2 id="glucose-chart-heading" className="mb-3 text-sm font-semibold text-foreground">
          Distribuição por faixa
        </h2>
        {distribution ? (
          <>
            <GlucosePieChart distribution={distribution} />
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-brand-blue">
                Ver tabela de dados (alternativa ao gráfico)
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Percentual de medições por faixa configurada</caption>
                  <thead>
                    <tr className="text-foreground/50">
                      <th scope="col" className="py-1 pr-3 font-medium">
                        Classificação
                      </th>
                      <th scope="col" className="py-1 font-medium">
                        Percentual
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="py-1.5 pr-3 text-foreground">{RANGE_CLASSIFICATION_LABELS.abaixo}</td>
                      <td className="py-1.5 text-foreground">{distribution.belowPct}%</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-1.5 pr-3 text-foreground">{RANGE_CLASSIFICATION_LABELS.dentro}</td>
                      <td className="py-1.5 text-foreground">{distribution.withinPct}%</td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="py-1.5 pr-3 text-foreground">{RANGE_CLASSIFICATION_LABELS.acima}</td>
                      <td className="py-1.5 text-foreground">{distribution.abovePct}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <p className="text-sm text-foreground/60">
            Configure uma faixa pessoal em Configurações para ver a distribuição por faixa.
          </p>
        )}
      </section>
    );
  }

  const points = buildAggregatedSeries(measurements, granularity);

  return (
    <section aria-labelledby="glucose-chart-heading" className="rounded-2xl border border-border bg-surface p-4">
      <h2 id="glucose-chart-heading" className="mb-3 text-sm font-semibold text-foreground">
        Glicemia ao longo do tempo
      </h2>
      <GlucoseAggregatedChart points={points} chartType={chartType} targetRange={targetRange} />
      <p className="mt-2 text-xs text-foreground/50">
        Cada ponto é a média das medições do período agrupado. Baldes sem
        registro não são preenchidos e nenhuma tendência futura é projetada.
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand-blue">
          Ver tabela de dados (alternativa ao gráfico)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Médias de glicemia agrupadas por {GRANULARITY_LABEL[granularity].toLowerCase()}
            </caption>
            <thead>
              <tr className="text-foreground/50">
                <th scope="col" className="py-1 pr-3 font-medium">
                  {GRANULARITY_LABEL[granularity]}
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Média
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Mín. / Máx.
                </th>
                <th scope="col" className="py-1 font-medium">
                  Medições
                </th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => (
                <tr key={point.bucketKey} className="border-t border-border">
                  <td className="py-1.5 pr-3 text-foreground">{point.label}</td>
                  <td className="py-1.5 pr-3 text-foreground">{point.average} mg/dL</td>
                  <td className="py-1.5 pr-3 text-foreground">
                    {point.min} / {point.max} mg/dL
                  </td>
                  <td className="py-1.5 text-foreground">{point.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
