"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import { buildContextSeriesPoints } from "@/features/measurements/chart-data";
import {
  CONTEXT_BUCKETS,
  CONTEXT_BUCKET_COLOR_VAR,
  CONTEXT_BUCKET_LABELS,
  type ContextBucket,
} from "@/features/measurements/context-buckets";

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

type TooltipPayloadEntry = { dataKey: ContextBucket; value: number; color: string };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="text-foreground/60">{formatTooltipDate(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="font-semibold text-foreground">
          <span aria-hidden="true" style={{ color: entry.color }}>
            ●{" "}
          </span>
          {CONTEXT_BUCKET_LABELS[entry.dataKey]}: {entry.value} mg/dL
        </p>
      ))}
    </div>
  );
}

type ContextSeriesChartProps = {
  measurements: GlucoseMeasurement[];
};

export default function ContextSeriesChart({ measurements }: ContextSeriesChartProps) {
  const data = buildContextSeriesPoints(measurements);
  const presentBuckets = CONTEXT_BUCKETS.filter((bucket) => data.some((point) => point[bucket] != null));

  return (
    <div style={{ width: "100%", height: 280 }}>
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
          {presentBuckets.map((bucket) => (
            <Line
              key={bucket}
              type="monotone"
              dataKey={bucket}
              name={bucket}
              stroke={CONTEXT_BUCKET_COLOR_VAR[bucket]}
              strokeWidth={2}
              dot={{ r: 4, fill: CONTEXT_BUCKET_COLOR_VAR[bucket] }}
              activeDot={{ r: 6 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
