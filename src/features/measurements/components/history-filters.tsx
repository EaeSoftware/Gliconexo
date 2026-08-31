"use client";

import { useId } from "react";
import {
  MEASUREMENT_CONTEXTS,
  MEASUREMENT_CONTEXT_LABELS,
} from "@/features/measurements/constants";
import type {
  ContextFilter,
  MeasurementListFilters,
  OriginFilter,
  PeriodFilter,
  RangeFilter,
} from "@/features/measurements/filter-measurements";

const PERIODS: { value: PeriodFilter; label: string }[] = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: "all", label: "Tudo" },
  { value: "custom", label: "Período personalizado" },
];

const RANGES: { value: RangeFilter; label: string }[] = [
  { value: "all", label: "Todas as faixas" },
  { value: "abaixo", label: "Abaixo da faixa" },
  { value: "dentro", label: "Dentro da faixa" },
  { value: "acima", label: "Acima da faixa" },
];

const ORIGINS: { value: OriginFilter; label: string }[] = [
  { value: "all", label: "Manual e câmera" },
  { value: "manual", label: "Somente manual" },
  { value: "ocr", label: "Somente câmera (OCR)" },
];

type HistoryFiltersProps = {
  filters: MeasurementListFilters;
  onChange: (filters: MeasurementListFilters) => void;
  hasTargetRange: boolean;
};

export function HistoryFilters({ filters, onChange, hasTargetRange }: HistoryFiltersProps) {
  const periodId = useId();
  const contextId = useId();
  const rangeId = useId();
  const originId = useId();
  const fromId = useId();
  const toId = useId();

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <legend className="sr-only">Filtrar histórico de medições</legend>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={periodId} className="text-sm font-medium text-foreground">
            Período
          </label>
          <select
            id={periodId}
            className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
            value={String(filters.period)}
            onChange={(event) => {
              const raw = event.target.value;
              const period: PeriodFilter =
                raw === "all" || raw === "custom" ? raw : (Number(raw) as 7 | 30 | 90);
              onChange({ ...filters, period });
            }}
          >
            {PERIODS.map((period) => (
              <option key={String(period.value)} value={String(period.value)}>
                {period.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={contextId} className="text-sm font-medium text-foreground">
            Contexto
          </label>
          <select
            id={contextId}
            className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
            value={filters.context}
            onChange={(event) =>
              onChange({ ...filters, context: event.target.value as ContextFilter })
            }
          >
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
          <select
            id={rangeId}
            disabled={!hasTargetRange}
            className={`min-h-11 rounded-lg border border-border px-3 text-sm ${
              hasTargetRange ? "bg-surface" : "bg-surface-muted text-foreground/50"
            }`}
            value={filters.range}
            onChange={(event) => onChange({ ...filters, range: event.target.value as RangeFilter })}
          >
            {RANGES.map((item) => (
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
          <select
            id={originId}
            className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
            value={filters.origin}
            onChange={(event) =>
              onChange({ ...filters, origin: event.target.value as OriginFilter })
            }
          >
            {ORIGINS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasTargetRange ? (
        <p className="text-xs text-foreground/50">
          O filtro por faixa fica disponível quando você configurar sua
          faixa pessoal em Configurações.
        </p>
      ) : null}

      {filters.period === "custom" ? (
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={fromId} className="text-sm font-medium text-foreground">
              De
            </label>
            <input
              id={fromId}
              type="date"
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
              value={filters.customFrom ?? ""}
              onChange={(event) => onChange({ ...filters, customFrom: event.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={toId} className="text-sm font-medium text-foreground">
              Até
            </label>
            <input
              id={toId}
              type="date"
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
              value={filters.customTo ?? ""}
              onChange={(event) => onChange({ ...filters, customTo: event.target.value })}
            />
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
