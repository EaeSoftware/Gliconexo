import type { Metadata } from "next";
import { EmptyState } from "@/components/feedback/empty-state";

export const metadata: Metadata = { title: "Relatórios" };

export default function RelatoriosPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
      <p className="text-sm text-foreground/70">
        Exporte suas medições em PDF ou CSV para uso pessoal ou
        compartilhamento com um profissional de saúde.
      </p>

      {/* TODO (Fase 7): geração de PDF/CSV a partir dos dados reais e filtros confirmados. */}
      <EmptyState
        icon="🗎"
        title="Nenhum dado para exportar ainda"
        description="Assim que você tiver medições registradas, poderá escolher um período e exportar em PDF ou CSV."
      />
    </div>
  );
}
