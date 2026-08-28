"use client";

import Link from "next/link";
import { Activity, TrendingUp, TrendingDown, Hash } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import type { TargetRange } from "@/features/measurements/classify";
import { getDashboardProgress } from "@/features/measurements/dashboard-progress";
import { MEASUREMENT_CONTEXT_LABELS, MIN_MEASUREMENTS_FOR_DASHBOARD } from "@/features/measurements/constants";
import { formatMeasurementCount } from "@/features/measurements/pluralize";
import { computeMeasurementStats, computeRangeDistribution } from "@/features/measurements/stats";
import { filterMeasurements } from "@/features/measurements/filter-measurements";
import { GlucoseChartSection } from "@/features/measurements/components/glucose-chart-section";
import { StatCard } from "@/features/measurements/components/stat-card";

/** Período fixo do resumo da Início — o filtro de período completo fica em Análises. */
const HOME_SUMMARY_PERIOD = 30;

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function HomeDashboard() {
  const measurements = useLiveQuery(
    () => getDb().measurements.orderBy("measuredAt").reverse().toArray(),
    [],
  );
  const preferences = useLiveQuery(() => getDb().preferences.get("local"), []);

  if (measurements === undefined) {
    return (
      <div role="status" aria-live="polite" className="text-sm text-foreground/60">
        Carregando suas medições...
      </div>
    );
  }

  const confirmed = measurements.filter((m) => !m.deletedAt);
  const { isUnlocked, remaining } = getDashboardProgress(confirmed.length);
  const last = confirmed[0];

  return (
    <>
      <section
        aria-labelledby="last-measurement-heading"
        className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm"
        style={{ backgroundImage: "var(--hero-mesh)" }}
      >
        <h2
          id="last-measurement-heading"
          className="flex items-center gap-2 text-sm font-semibold text-foreground/70"
        >
          <Activity aria-hidden="true" size={16} className="text-brand-blue" />
          Última medição
        </h2>
        {last ? (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-display text-4xl font-bold text-foreground">
              {last.valueMgDl}
              <span className="ml-1 text-base font-normal text-foreground/60">mg/dL</span>
            </span>
            <span className="w-full text-sm text-foreground/70 sm:w-auto">
              {formatDateTime(last.measuredAt)} · {MEASUREMENT_CONTEXT_LABELS[last.context]}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-foreground/70">
            Você ainda não tem medições registradas.{" "}
            <Link href="/app/registrar" className="font-medium text-brand-blue hover:underline">
              Registrar a primeira agora
            </Link>
          </p>
        )}
      </section>

      {isUnlocked ? (
        <HomeSummary measurements={confirmed} targetRange={preferences ?? null} />
      ) : (
        <section
          aria-labelledby="dashboard-progress-heading"
          className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
        >
          <h2 id="dashboard-progress-heading" className="font-semibold text-foreground">
            {confirmed.length} de {MIN_MEASUREMENTS_FOR_DASHBOARD} medições registradas
          </h2>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand-blue transition-all"
              style={{
                width: `${Math.min(100, (confirmed.length / MIN_MEASUREMENTS_FOR_DASHBOARD) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-3 text-sm text-foreground/70">
            Faltam {formatMeasurementCount(remaining, { confirmed: true })} para liberar
            gráficos e indicadores. Seu histórico e a exportação de dados já
            estão disponíveis.
          </p>
        </section>
      )}
    </>
  );
}

type HomeSummaryProps = {
  measurements: GlucoseMeasurement[];
  targetRange: TargetRange | null;
};

/**
 * Resumo exibido a partir da quarta medição confirmada, conforme
 * CLAUDE.md, seção 10.4: gráfico resumido, média/mínimo/máximo,
 * quantidade de registros, distribuição pela faixa (quando configurada)
 * e um atalho para a análise completa.
 */
function HomeSummary({ measurements, targetRange }: HomeSummaryProps) {
  const recent = filterMeasurements(measurements, {
    period: HOME_SUMMARY_PERIOD,
    context: "all",
    origin: "all",
    range: "all",
  });
  const stats = computeMeasurementStats(recent);
  const distribution = computeRangeDistribution(recent, targetRange);

  return (
    <section aria-labelledby="home-summary-heading" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 id="home-summary-heading" className="font-display font-semibold text-foreground">
          Resumo dos últimos {HOME_SUMMARY_PERIOD} dias
        </h2>
        <Link href="/app/analises" className="text-sm font-medium text-brand-blue hover:underline">
          Ver análise completa
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-foreground/70">
          Nenhuma medição nos últimos {HOME_SUMMARY_PERIOD} dias.{" "}
          <Link href="/app/analises" className="font-medium text-brand-blue hover:underline">
            Ver análise completa
          </Link>{" "}
          para outros períodos.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Média" value={String(stats.average ?? "—")} unit="mg/dL" icon={Activity} />
            <StatCard label="Mínimo" value={String(stats.min ?? "—")} unit="mg/dL" icon={TrendingDown} />
            <StatCard label="Máximo" value={String(stats.max ?? "—")} unit="mg/dL" icon={TrendingUp} />
            <StatCard label="Registros" value={String(stats.count)} icon={Hash} />
          </div>

          {distribution ? (
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Distribuição em relação à faixa configurada
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold text-status-below">{distribution.belowPct}%</p>
                  <p className="text-xs text-foreground/60">Abaixo</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-status-within">{distribution.withinPct}%</p>
                  <p className="text-xs text-foreground/60">Dentro</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-status-above">{distribution.abovePct}%</p>
                  <p className="text-xs text-foreground/60">Acima</p>
                </div>
              </div>
            </div>
          ) : null}

          <GlucoseChartSection measurements={recent} targetRange={targetRange} />
        </>
      )}
    </section>
  );
}
