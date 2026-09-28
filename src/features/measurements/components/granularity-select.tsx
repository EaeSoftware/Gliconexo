"use client";

import { useId } from "react";
import type { ChartGranularity } from "@/features/measurements/chart-data";

const GRANULARITIES: { value: ChartGranularity; label: string }[] = [
  { value: "day", label: "Por dia" },
  { value: "week", label: "Por semana" },
  { value: "month", label: "Por mês" },
];

type GranularitySelectProps = {
  value: ChartGranularity;
  onChange: (granularity: ChartGranularity) => void;
  label?: string;
};

/** Seletor de agrupamento (dia/semana/mês) dos pontos do gráfico principal. */
export function GranularitySelect({ value, onChange, label = "Agrupar por" }: GranularitySelectProps) {
  const selectId = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={selectId}
        className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value as ChartGranularity)}
      >
        {GRANULARITIES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
