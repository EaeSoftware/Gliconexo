"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { measurementRepository } from "@/lib/db/measurement-repository";
import {
  DEFAULT_MEASUREMENT_FILTERS,
  filterMeasurements,
  groupMeasurementsByDay,
} from "@/features/measurements/filter-measurements";
import { HistoryFilters } from "@/features/measurements/components/history-filters";
import { MeasurementRow } from "@/features/measurements/components/measurement-row";
import { UndoToast } from "@/components/feedback/undo-toast";
import { EmptyState } from "@/components/feedback/empty-state";
import { ButtonLink } from "@/components/ui/button";

export function HistoryList() {
  const [filters, setFilters] = useState(DEFAULT_MEASUREMENT_FILTERS);
  const [pendingUndoId, setPendingUndoId] = useState<string | null>(null);

  const measurements = useLiveQuery(
    () => getDb().measurements.orderBy("measuredAt").reverse().toArray(),
    [],
  );

  if (measurements === undefined) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-foreground/60">
        Carregando histórico...
      </p>
    );
  }

  const confirmed = measurements.filter((m) => !m.deletedAt);
  const filtered = filterMeasurements(confirmed, filters);
  const groups = groupMeasurementsByDay(filtered);

  async function handleDelete(id: string) {
    await measurementRepository.remove(id);
    setPendingUndoId(id);
  }

  async function handleUndo() {
    if (!pendingUndoId) return;
    await measurementRepository.restore(pendingUndoId);
    setPendingUndoId(null);
  }

  return (
    <>
      <HistoryFilters filters={filters} onChange={setFilters} />

      {groups.length === 0 ? (
        confirmed.length === 0 ? (
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
        ) : (
          <EmptyState
            icon="🔍"
            title="Nenhuma medição neste filtro"
            description="Tente ampliar o período ou remover algum filtro."
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.dateKey} aria-label={group.label}>
              <h2 className="mb-2 text-sm font-semibold text-foreground/70">{group.label}</h2>
              <ul className="rounded-2xl border border-border bg-surface">
                {group.measurements.map((measurement) => (
                  <MeasurementRow
                    key={measurement.id}
                    measurement={measurement}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {pendingUndoId ? (
        <UndoToast
          message="Medição excluída."
          onUndo={handleUndo}
          onExpire={() => setPendingUndoId(null)}
        />
      ) : null}
    </>
  );
}
