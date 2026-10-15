"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { measurementRepository } from "@/lib/db/measurement-repository";
import { ocrImageRepository } from "@/lib/db/ocr-image-repository";
import { classifyValue } from "@/features/measurements/classify";
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
import { ClipboardList, SearchX } from "lucide-react";

export function HistoryList() {
  const [filters, setFilters] = useState(DEFAULT_MEASUREMENT_FILTERS);
  const [pendingUndoId, setPendingUndoId] = useState<string | null>(null);
  const pendingUndoPhotoRef = useRef<{ id: string; blob: Blob } | null>(null);

  const measurements = useLiveQuery(
    () => getDb().measurements.orderBy("measuredAt").reverse().toArray(),
    [],
  );
  const preferences = useLiveQuery(() => getDb().preferences.get("local"), []);

  if (measurements === undefined) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-foreground/60">
        Carregando histórico...
      </p>
    );
  }

  const hasTargetRange = Boolean(
    preferences?.targetMinMgDl != null && preferences?.targetMaxMgDl != null,
  );
  const confirmed = measurements.filter((m) => !m.deletedAt);
  const filtered = filterMeasurements(confirmed, filters, new Date(), preferences ?? null);
  const groups = groupMeasurementsByDay(filtered);

  async function handleDelete(id: string) {
    // `remove` apaga a foto do visor junto; guardamos o blob só em memória,
    // durante a janela de "desfazer", para regravá-lo caso o usuário desfaça.
    const photo = await ocrImageRepository.get(id);
    pendingUndoPhotoRef.current = photo ? { id, blob: photo.blob } : null;
    await measurementRepository.remove(id);
    setPendingUndoId(id);
  }

  async function handleUndo() {
    if (!pendingUndoId) return;
    await measurementRepository.restore(pendingUndoId);
    const photo = pendingUndoPhotoRef.current;
    if (photo && photo.id === pendingUndoId) {
      await ocrImageRepository.save(photo.id, photo.blob);
    }
    pendingUndoPhotoRef.current = null;
    setPendingUndoId(null);
  }

  function handleUndoExpire() {
    pendingUndoPhotoRef.current = null;
    setPendingUndoId(null);
  }

  return (
    <>
      <HistoryFilters filters={filters} onChange={setFilters} hasTargetRange={hasTargetRange} />

      {groups.length === 0 ? (
        confirmed.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
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
            icon={SearchX}
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
                    classification={classifyValue(measurement.valueMgDl, preferences ?? null)}
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
          onExpire={handleUndoExpire}
        />
      ) : null}
    </>
  );
}
