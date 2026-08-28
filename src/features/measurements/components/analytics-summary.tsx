"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { getDashboardProgress } from "@/features/measurements/dashboard-progress";
import { computeMeasurementStats, computeRangeDistribution } from "@/features/measurements/stats";
import { filterMeasurements, type PeriodFilter } from "@/features/measurements/filter-measurements";
import { GlucoseChartSection } from "@/features/measurements/components/glucose-chart-section";
import { PeriodSelect } from "@/features/measurements/components/period-select";
import { formatMeasurementCount } from "@/features/measurements/pluralize";
import { EmptyState } from "@/components/feedback/empty-state";
import { ButtonLink } from "@/components/ui/button";

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">
        {value} {unit ? <span className="text-sm font-normal text-foreground/60">{unit}</span> : null}
      </p>
    </div>
  );
}

export function AnalyticsSummary() {
  const [period, setPeriod] = useState<PeriodFilter>(30);

  const measurements = useLiveQuery(
    () => getDb().measurements.filter((m) => !m.deletedAt).toArray(),
    [],
  );
  const preferences = useLiveQuery(() => getDb().preferences.get("local"), []);

  if (measurements === undefined) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-foreground/60">
        Carregando análises...
      </p>
    );
  }

  // A regra das 4 medições considera o histórico completo, não o período selecionado no filtro abaixo.
  const { isUnlocked, remaining } = getDashboardProgress(measurements.length);

  if (!isUnlocked) {
    return (
      <EmptyState
        icon="📈"
        title={
          remaining > 0
            ? `Faltam ${formatMeasurementCount(remaining)} para liberar os indicadores`
            : "Gráficos liberados"
        }
        description="Média, mínimo, máximo e distribuição por faixa aparecem aqui assim que você confirmar sua quarta medição. Nenhuma tendência é projetada e dias sem registro não são preenchidos automaticamente."
        action={
          <ButtonLink href="/app/registrar" variant="primary">
            Registrar medição
          </ButtonLink>
        }
      />
    );
  }

  const targetRange = preferences ?? null;
  const filtered = filterMeasurements(
    measurements,
    { period, context: "all", origin: "all", range: "all" },
  );
  const stats = computeMeasurementStats(filtered);
  const distribution = computeRangeDistribution(filtered, targetRange);

  return (
    <div className="flex flex-col gap-4">
      <PeriodSelect value={period} onChange={setPeriod} />

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nenhuma medição neste período"
          description="Escolha um período maior para ver seus indicadores."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Última medição" value={String(stats.last?.valueMgDl ?? "—")} unit="mg/dL" />
            <StatCard label="Média" value={String(stats.average ?? "—")} unit="mg/dL" />
            <StatCard label="Mínimo" value={String(stats.min ?? "—")} unit="mg/dL" />
            <StatCard label="Máximo" value={String(stats.max ?? "—")} unit="mg/dL" />
          </div>

          {distribution ? (
            <section aria-labelledby="range-distribution-heading" className="rounded-2xl border border-border bg-surface p-4">
              <h2 id="range-distribution-heading" className="mb-3 text-sm font-semibold text-foreground">
                Distribuição em relação à faixa configurada
              </h2>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold text-status-below">{distribution.belowPct}%</p>
                  <p className="text-xs text-foreground/60">Abaixo da faixa</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-status-within">{distribution.withinPct}%</p>
                  <p className="text-xs text-foreground/60">Dentro da faixa</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-status-above">{distribution.abovePct}%</p>
                  <p className="text-xs text-foreground/60">Acima da faixa</p>
                </div>
              </div>
            </section>
          ) : (
            <p className="text-xs text-foreground/50">
              Como você ainda não configurou uma faixa pessoal em
              Configurações, os valores não são classificados como
              abaixo/dentro/acima da faixa.
            </p>
          )}

          <GlucoseChartSection measurements={filtered} targetRange={targetRange} />

          <p className="text-xs text-foreground/50">
            Calculado com {formatMeasurementCount(stats.count, { confirmed: true })} no
            período selecionado.
          </p>
        </>
      )}
    </div>
  );
}
