"use client";

import { BarChart3, LineChart as LineChartIcon, PieChart } from "lucide-react";

export type ChartType = "line" | "bar" | "pie";

const OPTIONS: { value: ChartType; label: string; icon: typeof LineChartIcon }[] = [
  { value: "line", label: "Linha", icon: LineChartIcon },
  { value: "bar", label: "Barras", icon: BarChart3 },
  { value: "pie", label: "Pizza", icon: PieChart },
];

type ChartTypeSwitcherProps = {
  value: ChartType;
  onChange: (type: ChartType) => void;
  /** A pizza mostra a distribuição por faixa; sem faixa pessoal configurada não há o que desenhar. */
  pieDisabled?: boolean;
};

/** Alternador de tipo de gráfico (linha/barras/pizza) para o gráfico principal de Análises. */
export function ChartTypeSwitcher({ value, onChange, pieDisabled = false }: ChartTypeSwitcherProps) {
  return (
    <div role="radiogroup" aria-label="Tipo de gráfico" className="inline-flex gap-1 rounded-full border border-border bg-surface p-1">
      {OPTIONS.map((option) => {
        const disabled = option.value === "pie" && pieDisabled;
        const active = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={disabled ? "Configure uma faixa pessoal em Configurações para ver a pizza" : undefined}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? "bg-brand-blue text-white shadow-sm"
                : "text-foreground/70 hover:bg-surface-muted"
            }`}
          >
            <Icon aria-hidden="true" size={16} strokeWidth={2.25} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
