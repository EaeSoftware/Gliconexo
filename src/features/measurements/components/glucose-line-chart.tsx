"use client";

import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import type { TargetRange } from "@/features/measurements/classify";
import { MEASUREMENT_CONTEXT_LABELS } from "@/features/measurements/constants";

function formatAxisDate(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(
    new Date(timestamp),
  );
}

function formatTooltipDate(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

type ChartPoint = {
  timestamp: number;
  value: number;
  measurement: GlucoseMeasurement;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-foreground">{point.value} mg/dL</p>
      <p className="text-foreground/60">{formatTooltipDate(point.timestamp)}</p>
      <p className="text-foreground/60">
        {MEASUREMENT_CONTEXT_LABELS[point.measurement.context]}
      </p>
    </div>
  );
}

type GlucoseLineChartProps = {
  measurements: GlucoseMeasurement[];
  targetRange: TargetRange | null;
};

export default function GlucoseLineChart({ measurements, targetRange }: GlucoseLineChartProps) {
  const data: ChartPoint[] = [...measurements]
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .map((measurement) => ({
      timestamp: new Date(measurement.measuredAt).getTime(),
      value: measurement.valueMgDl,
      measurement,
    }));

  const hasRange = targetRange?.targetMinMgDl != null && targetRange?.targetMaxMgDl != null;

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatAxisDate}
            stroke="var(--color-border)"
            tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
          />
          <YAxis
            domain={[0, "dataMax + 40"]}
            stroke="var(--color-border)"
            tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />

          {hasRange ? (
            <ReferenceArea
              y1={targetRange.targetMinMgDl}
              y2={targetRange.targetMaxMgDl}
              fill="var(--color-status-within)"
              fillOpacity={0.12}
              stroke="none"
            />
          ) : null}
          {hasRange ? (
            <ReferenceLine
              y={targetRange.targetMinMgDl}
              stroke="var(--color-status-within)"
              strokeDasharray="4 4"
              label={{
                value: "Mínimo da faixa",
                position: "insideBottomLeft",
                fill: "var(--color-status-within)",
                fontSize: 11,
              }}
            />
          ) : null}
          {hasRange ? (
            <ReferenceLine
              y={targetRange.targetMaxMgDl}
              stroke="var(--color-status-within)"
              strokeDasharray="4 4"
              label={{
                value: "Máximo da faixa",
                position: "insideTopLeft",
                fill: "var(--color-status-within)",
                fontSize: 11,
              }}
            />
          ) : null}

          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-brand-blue)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-brand-blue)" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
