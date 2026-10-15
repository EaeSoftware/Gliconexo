"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyPoint } from "@/features/measurements/chart-data";
import type { TargetRange } from "@/features/measurements/classify";

export type HourlyGlucoseChartColors = {
  border: string;
  foreground: string;
  statusWithin: string;
  brandBlue: string;
};

const DEFAULT_COLORS: HourlyGlucoseChartColors = {
  border: "var(--color-border)",
  foreground: "var(--color-foreground)",
  statusWithin: "var(--color-status-within)",
  brandBlue: "var(--color-brand-blue)",
};

type HourSlot = Partial<Omit<HourlyPoint, "hour" | "label">> & { hour: number; label: string };

/**
 * Sempre 24 posições (0h–23h), mas as horas sem medição ficam sem valor:
 * com `connectNulls={false}` o Recharts não liga os pontos através de uma
 * hora vazia, então nada é interpolado (CLAUDE.md, seção 17, regra 5).
 */
function toHourSlots(points: HourlyPoint[]): HourSlot[] {
  const byHour = new Map(points.map((point) => [point.hour, point]));
  return Array.from({ length: 24 }, (_, hour) => {
    const point = byHour.get(hour);
    return point ?? { hour, label: `${String(hour).padStart(2, "0")}h` };
  });
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: HourSlot }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const slot = payload[0].payload;
  if (slot.average === undefined) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-foreground">{slot.average} mg/dL (média)</p>
      <p className="text-foreground/60">Às {slot.label}</p>
      <p className="text-foreground/60">
        Mín. {slot.min} · Máx. {slot.max} · {slot.count}{" "}
        {slot.count === 1 ? "medição" : "medições"}
      </p>
    </div>
  );
}

type HourlyGlucoseChartProps = {
  points: HourlyPoint[];
  targetRange: TargetRange | null;
  height?: number;
  /**
   * Cores resolvidas em vez das variáveis CSS padrão — usado ao
   * rasterizar o gráfico para o PDF, onde `var(--...)` não é herdado.
   */
  colors?: HourlyGlucoseChartColors;
};

export default function HourlyGlucoseChart({
  points,
  targetRange,
  height = 260,
  colors = DEFAULT_COLORS,
}: HourlyGlucoseChartProps) {
  const data = toHourSlots(points);
  const hasRange = targetRange?.targetMinMgDl != null && targetRange?.targetMaxMgDl != null;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="hour"
            type="number"
            domain={[0, 23]}
            ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
            tickFormatter={(hour: number) => `${String(hour).padStart(2, "0")}h`}
            stroke={colors.border}
            tick={{ fill: colors.foreground, fontSize: 12 }}
          />
          <YAxis
            domain={[0, "dataMax + 40"]}
            stroke={colors.border}
            tick={{ fill: colors.foreground, fontSize: 12 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          {hasRange ? (
            <ReferenceArea
              y1={targetRange!.targetMinMgDl}
              y2={targetRange!.targetMaxMgDl}
              fill={colors.statusWithin}
              fillOpacity={0.12}
              stroke="none"
            />
          ) : null}
          {/* Mínimo e máximo da hora: só os pontos, sem linha, para não sugerir tendência entre horas. */}
          <Line
            dataKey="max"
            stroke="none"
            dot={{ r: 3, fill: "none", stroke: colors.brandBlue, strokeWidth: 1.5 }}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            dataKey="min"
            stroke="none"
            dot={{ r: 3, fill: "none", stroke: colors.brandBlue, strokeWidth: 1.5 }}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="average"
            stroke={colors.brandBlue}
            strokeWidth={2}
            dot={{ r: 4, fill: colors.brandBlue }}
            activeDot={{ r: 6 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
