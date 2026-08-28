import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { HomeDashboard } from "@/features/measurements/components/home-dashboard";

export const metadata: Metadata = { title: "Início" };

export default function InicioPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Olá!</h1>
        <p className="text-foreground/70">
          Bem-vindo ao seu painel de acompanhamento glicêmico.
        </p>
      </div>

      <ButtonLink
        href="/app/registrar"
        variant="primary"
        className="min-h-16 w-full gap-2 text-base"
      >
        <Plus aria-hidden="true" size={20} strokeWidth={2.5} />
        Registrar glicemia
      </ButtonLink>

      <HomeDashboard />

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
