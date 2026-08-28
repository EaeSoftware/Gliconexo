import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { MIN_MEASUREMENTS_FOR_DASHBOARD } from "@/features/measurements/constants";
import { getDashboardProgress } from "@/features/measurements/dashboard-progress";

export const metadata: Metadata = { title: "Início" };

export default function InicioPage() {
  // TODO (Fase 3/4): substituir pela contagem real vinda do repositório local (IndexedDB) + Supabase.
  const confirmedMeasurementsCount = 0;
  const { remaining } = getDashboardProgress(confirmedMeasurementsCount);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá!</h1>
        <p className="text-foreground/70">
          Bem-vindo ao seu painel de acompanhamento glicêmico.
        </p>
      </div>

      <ButtonLink
        href="/app/registrar"
        variant="primary"
        className="min-h-16 w-full text-base"
      >
        + Registrar glicemia
      </ButtonLink>

      <section
        aria-labelledby="dashboard-progress-heading"
        className="rounded-2xl border border-border bg-surface p-5"
      >
        <h2 id="dashboard-progress-heading" className="font-semibold text-foreground">
          {confirmedMeasurementsCount} de {MIN_MEASUREMENTS_FOR_DASHBOARD} medições registradas
        </h2>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand-blue transition-all"
            style={{
              width: `${Math.min(
                100,
                (confirmedMeasurementsCount / MIN_MEASUREMENTS_FOR_DASHBOARD) * 100,
              )}%`,
            }}
          />
        </div>
        <p className="mt-3 text-sm text-foreground/70">
          {remaining > 0
            ? `Faltam ${remaining} medi${remaining > 1 ? "ções" : "ção"} confirmada${remaining > 1 ? "s" : ""} para liberar gráficos e indicadores.`
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
        <p className="mt-2 text-sm text-foreground/70">
          Você ainda não tem medições registradas.{" "}
          <Link href="/app/registrar" className="font-medium text-brand-blue hover:underline">
            Registrar a primeira agora
          </Link>
        </p>
      </section>

      <Link
        href="/app/historico"
        className="text-center text-sm font-medium text-brand-blue hover:underline"
      >
        Ver histórico completo
      </Link>

      <p className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-xs text-foreground/60">
        O GlicoNexo é uma ferramenta de registro e organização de dados. Ele
        não substitui o acompanhamento com um profissional de saúde.
      </p>
    </div>
  );
}
