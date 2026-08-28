"use client";

import { useId } from "react";
import { MEASUREMENT_CONTEXTS, MEASUREMENT_CONTEXT_LABELS } from "@/features/measurements/constants";

const PERIODS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "custom", label: "Período personalizado" },
] as const;

const RANGE_CLASSIFICATIONS = [
  { value: "all", label: "Todas as faixas" },
  { value: "below", label: "Abaixo da faixa" },
  { value: "within", label: "Dentro da faixa" },
  { value: "above", label: "Acima da faixa" },
] as const;

const ORIGINS = [
  { value: "all", label: "Manual e câmera" },
  { value: "manual", label: "Somente manual" },
  { value: "ocr", label: "Somente câmera (OCR)" },
] as const;

export function HistoryFilters() {
  const periodId = useId();
  const contextId = useId();
  const rangeId = useId();
  const originId = useId();

  return (
    <fieldset className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      <legend className="sr-only">Filtrar histórico de medições</legend>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={periodId} className="text-sm font-medium text-foreground">
          Período
        </label>
        <select id={periodId} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm">
          {PERIODS.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={contextId} className="text-sm font-medium text-foreground">
          Contexto
        </label>
        <select id={contextId} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm">
          <option value="all">Todos os contextos</option>
          {MEASUREMENT_CONTEXTS.map((context) => (
            <option key={context} value={context}>
              {MEASUREMENT_CONTEXT_LABELS[context]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={rangeId} className="text-sm font-medium text-foreground">
          Faixa
        </label>
        <select id={rangeId} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm">
          {RANGE_CLASSIFICATIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={originId} className="text-sm font-medium text-foreground">
          Origem
        </label>
        <select id={originId} className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm">
          {ORIGINS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
