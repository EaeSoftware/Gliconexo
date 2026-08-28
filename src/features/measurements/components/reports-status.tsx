"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { EmptyState } from "@/components/feedback/empty-state";

export function ReportsStatus() {
  const count = useLiveQuery(
    () => getDb().measurements.filter((m) => !m.deletedAt).count(),
    [],
  );

  if (count === undefined) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-foreground/60">
        Carregando...
      </p>
    );
  }

  if (count === 0) {
    return (
      <EmptyState
        icon="🗎"
        title="Nenhum dado para exportar ainda"
        description="Assim que você tiver medições registradas, poderá escolher um período e exportar em PDF ou CSV."
      />
    );
  }

  return (
    <EmptyState
      icon="🗎"
      title="Exportação ainda não implementada"
      description={`Você já tem ${count} medição${count > 1 ? "ões" : ""} registrada${count > 1 ? "s" : ""} neste dispositivo, mas a geração de PDF/CSV ainda está pendente (Fase 7 do desenvolvimento).`}
    />
  );
}
