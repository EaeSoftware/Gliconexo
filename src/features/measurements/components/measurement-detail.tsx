"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { measurementRepository } from "@/lib/db/measurement-repository";
import type { MeasurementInput } from "@/features/measurements/schemas";
import {
  MEASUREMENT_CONTEXT_LABELS,
  MEAL_RELATION_LABELS,
} from "@/features/measurements/constants";
import { ManualEntryForm } from "@/features/measurements/components/manual-entry-form";
import { classifyValue } from "@/features/measurements/classify";
import { ClassificationBadge } from "@/features/measurements/components/classification-badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { SearchX } from "lucide-react";

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function MeasurementDetail({ id }: { id: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Dexie resolve `.get()` para `undefined` quando não encontra o registro,
  // o mesmo valor que `useLiveQuery` usa enquanto a consulta ainda está
  // carregando — por isso convertemos "não encontrado" para `null`
  // explicitamente, distinguindo os dois estados.
  const measurement = useLiveQuery(
    async () => (await getDb().measurements.get(id)) ?? null,
    [id],
  );
  const preferences = useLiveQuery(() => getDb().preferences.get("local"), []);

  if (measurement === undefined) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-foreground/60">
        Carregando medição...
      </p>
    );
  }

  if (measurement === null || measurement.deletedAt) {
    return (
      <EmptyState
        icon={SearchX}
        title="Medição não encontrada"
        description="Este registro não existe neste dispositivo ou já foi excluído."
        action={
          <ButtonLink href="/app/historico" variant="primary">
            Voltar ao histórico
          </ButtonLink>
        }
      />
    );
  }

  async function handleDelete() {
    await measurementRepository.remove(id);
    router.push("/app/historico");
  }

  if (mode === "edit") {
    const initialValues: MeasurementInput = {
      valueMgDl: measurement.valueMgDl,
      measuredAt: measurement.measuredAt,
      context: measurement.context,
      mealRelation: measurement.mealRelation,
      notes: measurement.notes,
    };

    return (
      <ManualEntryForm
        mode="edit"
        measurementId={measurement.id}
        initialValues={initialValues}
        onSaved={() => setMode("view")}
        onCancel={() => setMode("view")}
      />
    );
  }

  const classification = classifyValue(measurement.valueMgDl, preferences ?? null);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="text-3xl font-bold text-foreground">
            {measurement.valueMgDl} <span className="text-lg font-normal text-foreground/60">mg/dL</span>
          </p>
          {classification ? <ClassificationBadge classification={classification} /> : null}
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-foreground/50">Data e horário</dt>
            <dd className="text-foreground">{formatDateTime(measurement.measuredAt)}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Contexto</dt>
            <dd className="text-foreground">{MEASUREMENT_CONTEXT_LABELS[measurement.context]}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Relação com a refeição</dt>
            <dd className="text-foreground">{MEAL_RELATION_LABELS[measurement.mealRelation]}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Origem</dt>
            <dd className="text-foreground">
              {measurement.source === "ocr" ? "Câmera (OCR)" : "Manual"}
            </dd>
          </div>
          {measurement.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-foreground/50">Observação</dt>
              <dd className="text-foreground">{measurement.notes}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-4 text-xs text-foreground/40">
          Ainda não sincronizado com a nuvem · versão {measurement.version}
        </p>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setMode("edit")}>
          Editar
        </Button>
        {confirmingDelete ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1 bg-status-below hover:bg-status-below/90"
              onClick={handleDelete}
            >
              Confirmar exclusão
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-status-below/40 text-status-below hover:bg-status-below/10"
            onClick={() => setConfirmingDelete(true)}
          >
            Excluir
          </Button>
        )}
      </div>
    </div>
  );
}
