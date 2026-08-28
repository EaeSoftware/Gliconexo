"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { getDashboardProgress } from "@/features/measurements/dashboard-progress";
import { MIN_MEASUREMENTS_FOR_DASHBOARD, MEASUREMENT_CONTEXT_LABELS } from "@/features/measurements/constants";
import { formatMeasurementCount } from "@/features/measurements/pluralize";

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

  if (measurements === undefined) {
    return (
      <div role="status" aria-live="polite" className="text-sm text-foreground/60">
        Carregando suas medições...
      </div>
    );
  }

  const confirmed = measurements.filter((m) => !m.deletedAt);
  const { remaining } = getDashboardProgress(confirmed.length);
  const last = confirmed[0];

  return (
    <>
      <section
        aria-labelledby="dashboard-progress-heading"
        className="rounded-2xl border border-border bg-surface p-5"
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
          {remaining > 0
            ? `Faltam ${formatMeasurementCount(remaining, { confirmed: true })} para liberar gráficos e indicadores.`
            : "Seus gráficos e indicadores já estão disponíveis."}
        </p>
      </section>

      <section
        aria-labelledby="last-measurement-heading"
        className="rounded-2xl border border-border bg-surface p-5"
      >
        <h2 id="last-measurement-heading" className="font-semibold text-foreground">
          Última medição
        </h2>
        {last ? (
          <p className="mt-2 text-sm text-foreground/80">
            <span className="text-lg font-semibold text-foreground">{last.valueMgDl} mg/dL</span>
            {" · "}
            {formatDateTime(last.measuredAt)}
            {" · "}
            {MEASUREMENT_CONTEXT_LABELS[last.context]}
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
    </>
  );
}
