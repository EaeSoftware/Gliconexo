import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { MIN_MEASUREMENTS_FOR_DASHBOARD } from "@/features/measurements/constants";

export const metadata: Metadata = { title: "Análises" };

export default function AnalisesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Análises</h1>

      {/* TODO (Fase 6): habilitar gráficos e indicadores quando houver >= 4 medições confirmadas. */}
      <EmptyState
        icon="📈"
        title={`Gráficos liberados a partir de ${MIN_MEASUREMENTS_FOR_DASHBOARD} medições`}
        description="Média, mínimo, máximo e distribuição por faixa aparecem aqui assim que você confirmar sua quarta medição. Nenhuma tendência é projetada e dias sem registro não são preenchidos automaticamente."
        action={
          <ButtonLink href="/app/registrar" variant="primary">
            Registrar medição
          </ButtonLink>
        }
      />
    </div>
  );
}
