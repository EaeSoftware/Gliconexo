"use client";

import { useState } from "react";
import Link from "next/link";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import { MEASUREMENT_CONTEXT_LABELS } from "@/features/measurements/constants";
import { Button } from "@/components/ui/button";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

type MeasurementRowProps = {
  measurement: GlucoseMeasurement;
  onDelete: (id: string) => void;
};

export function MeasurementRow({ measurement, onDelete }: MeasurementRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <Link
        href={`/app/historico/${measurement.id}`}
        className="flex flex-1 items-center gap-3 rounded-lg py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue"
      >
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-foreground">
            {measurement.valueMgDl} <span className="text-sm font-normal text-foreground/60">mg/dL</span>
          </span>
          <span className="text-sm text-foreground/60">
            {formatTime(measurement.measuredAt)} · {MEASUREMENT_CONTEXT_LABELS[measurement.context]}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground/60">
          {measurement.source === "ocr" ? "Câmera" : "Manual"}
        </span>
        <span
          className="rounded-full bg-status-above/10 px-2 py-0.5 text-xs font-medium text-status-above"
          title="Ainda não sincronizado com a nuvem"
        >
          Pendente
        </span>

        {confirmingDelete ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              className="min-h-8 px-3 text-xs"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="min-h-8 bg-status-below px-3 text-xs hover:bg-status-below/90"
              onClick={() => {
                onDelete(measurement.id);
                setConfirmingDelete(false);
              }}
            >
              Confirmar
            </Button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={`Excluir medição de ${measurement.valueMgDl} mg/dL`}
            onClick={() => setConfirmingDelete(true)}
            className="rounded-full p-2 text-foreground/50 hover:bg-status-below/10 hover:text-status-below"
          >
            <span aria-hidden="true">🗑</span>
          </button>
        )}
      </div>
    </li>
  );
}
