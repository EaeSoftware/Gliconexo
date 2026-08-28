import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { HistoryFilters } from "@/features/measurements/components/history-filters";

export const metadata: Metadata = { title: "Histórico" };

export default function HistoricoPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Histórico</h1>

      <HistoryFilters />

      {/* TODO (Fase 3): listar medições reais do repositório local, com paginação. */}
      <EmptyState
        icon="📋"
        title="Nenhuma medição encontrada"
        description="Assim que você registrar sua primeira medição, ela aparecerá aqui, organizada por dia."
        action={
          <ButtonLink href="/app/registrar" variant="primary">
            Registrar medição
          </ButtonLink>
        }
      />
    </div>
  );
}
