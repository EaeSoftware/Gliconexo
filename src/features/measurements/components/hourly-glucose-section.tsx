"use client";

import dynamic from "next/dynamic";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import type { TargetRange } from "@/features/measurements/classify";
import { buildHourlyGlucoseProfile } from "@/features/measurements/chart-data";
import { formatMeasurementCount } from "@/features/measurements/pluralize";

const HourlyGlucoseChart = dynamic(
  () => import("@/features/measurements/components/hourly-glucose-chart"),
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

type HourlyGlucoseSectionProps = {
  measurements: GlucoseMeasurement[];
  targetRange: TargetRange | null;
};

export function HourlyGlucoseSection({ measurements, targetRange }: HourlyGlucoseSectionProps) {
  const points = buildHourlyGlucoseProfile(measurements);

  return (
    <section aria-labelledby="hourly-glucose-heading" className="rounded-2xl border border-border bg-surface p-4">
      <h2 id="hourly-glucose-heading" className="mb-1 text-sm font-semibold text-foreground">
        Glicemia por hora do dia
      </h2>
      <p className="mb-3 text-xs text-foreground/50">
        Média das medições feitas em cada hora, somando todos os dias do período. Os pontos
        vazios marcam o mínimo e o máximo da hora. Horas sem medição ficam sem ponto e nada
        é preenchido entre elas.
      </p>

      <HourlyGlucoseChart points={points} targetRange={targetRange} />

      <p className="mt-2 text-xs text-foreground/50">
        Calculado com {formatMeasurementCount(measurements.length, { confirmed: true })} em{" "}
        {points.length} {points.length === 1 ? "hora do dia" : "horas do dia"}.
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-brand-blue">
          Ver tabela de dados (alternativa ao gráfico)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Média, mínimo, máximo e quantidade de medições por hora do dia
            </caption>
            <thead>
              <tr className="text-foreground/50">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Hora
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Média
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Mín.
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Máx.
                </th>
                <th scope="col" className="py-1 font-medium">
                  Medições
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.hour} className="border-t border-border">
                  <td className="py-1.5 pr-3 text-foreground">{point.label}</td>
                  <td className="py-1.5 pr-3 text-foreground">{point.average} mg/dL</td>
                  <td className="py-1.5 pr-3 text-foreground">{point.min} mg/dL</td>
                  <td className="py-1.5 pr-3 text-foreground">{point.max} mg/dL</td>
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
