"use client";

import { useId } from "react";
import type { PeriodFilter } from "@/features/measurements/filter-measurements";

const PERIODS: { value: 7 | 30 | 90 | "all"; label: string }[] = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: "all", label: "Tudo" },
];

type PeriodSelectProps = {
  value: PeriodFilter;
  onChange: (period: 7 | 30 | 90 | "all") => void;
  label?: string;
};

/** Seletor de período simples (7/30/90 dias/tudo), usado em Análises e Relatórios. */
export function PeriodSelect({ value, onChange, label = "Período" }: PeriodSelectProps) {
  const periodId = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={periodId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={periodId}
        className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm"
        value={String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          onChange(raw === "all" ? "all" : (Number(raw) as 7 | 30 | 90));
        }}
      >
        {PERIODS.map((item) => (
          <option key={String(item.value)} value={String(item.value)}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
