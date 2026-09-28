"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AggregatedPoint } from "@/features/measurements/chart-data";
import type { TargetRange } from "@/features/measurements/classify";

type GlucoseAggregatedChartColors = {
  border: string;
  foreground: string;
  statusWithin: string;
  brandBlue: string;
};

const DEFAULT_COLORS: GlucoseAggregatedChartColors = {
  border: "var(--color-border)",
  foreground: "var(--color-foreground)",
  statusWithin: "var(--color-status-within)",
  brandBlue: "var(--color-brand-blue)",
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: AggregatedPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-foreground">{point.average} mg/dL (média)</p>
      <p className="text-foreground/60">{point.label}</p>
      <p className="text-foreground/60">
        Mín. {point.min} · Máx. {point.max} · {point.count}{" "}
        {point.count === 1 ? "medição" : "medições"}
      </p>
    </div>
  );
}

type GlucoseAggregatedChartProps = {
  points: AggregatedPoint[];
  chartType: "line" | "bar";
  targetRange: TargetRange | null;
  /**
   * Cores resolvidas em vez das variáveis CSS padrão — usado ao
   * rasterizar o gráfico para outros contextos que não herdem `var(--...)`.
   */
  colors?: GlucoseAggregatedChartColors;
};

export default function GlucoseAggregatedChart({
  points,
  chartType,
  targetRange,
  colors = DEFAULT_COLORS,
}: GlucoseAggregatedChartProps) {
  const hasRange = targetRange?.targetMinMgDl != null && targetRange?.targetMaxMgDl != null;

  const referenceElements = hasRange ? (
    <>
      <ReferenceArea
        y1={targetRange!.targetMinMgDl}
        y2={targetRange!.targetMaxMgDl}
        fill={colors.statusWithin}
        fillOpacity={0.12}
        stroke="none"
      />
      <ReferenceLine
        y={targetRange!.targetMinMgDl}
        stroke={colors.statusWithin}
        strokeDasharray="4 4"
        label={{
          value: "Mínimo da faixa",
          position: "insideBottomLeft",
          fill: colors.statusWithin,
          fontSize: 11,
        }}
      />
      <ReferenceLine
        y={targetRange!.targetMaxMgDl}
        stroke={colors.statusWithin}
        strokeDasharray="4 4"
        label={{
          value: "Máximo da faixa",
          position: "insideTopLeft",
          fill: colors.statusWithin,
          fontSize: 11,
        }}
      />
    </>
  ) : null;

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        {chartType === "bar" ? (
          <BarChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={colors.border}
              tick={{ fill: colors.foreground, fontSize: 12 }}
            />
            <YAxis
              domain={[0, "dataMax + 40"]}
              stroke={colors.border}
              tick={{ fill: colors.foreground, fontSize: 12 }}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
            {referenceElements}
            <Bar dataKey="average" fill={colors.brandBlue} isAnimationActive={false} />
          </BarChart>
        ) : (
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <XAxis
              dataKey="label"
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
            {referenceElements}
            <Line
              type="monotone"
              dataKey="average"
              stroke={colors.brandBlue}
              strokeWidth={2}
              dot={{ r: 3, fill: colors.brandBlue }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
