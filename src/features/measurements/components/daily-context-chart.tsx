"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import { buildDailyContextCounts, type DailyContextCount } from "@/features/measurements/chart-data";
import { CONTEXT_BUCKETS, CONTEXT_BUCKET_COLOR_VAR, CONTEXT_BUCKET_LABELS, type ContextBucket } from "@/features/measurements/context-buckets";

type TooltipPayloadEntry = { dataKey: ContextBucket; value: number; color: string };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const nonZero = payload.filter((entry) => entry.value > 0);
  if (nonZero.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      {nonZero.map((entry) => (
        <p key={entry.dataKey} className="text-foreground/80">
          <span aria-hidden="true" style={{ color: entry.color }}>
            ●{" "}
          </span>
          {CONTEXT_BUCKET_LABELS[entry.dataKey]}: {entry.value}
        </p>
      ))}
    </div>
  );
}

type DailyContextChartProps = {
  measurements: GlucoseMeasurement[];
};

export default function DailyContextChart({ measurements }: DailyContextChartProps) {
  const data: DailyContextCount[] = buildDailyContextCounts(measurements);

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--color-border)"
            tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            stroke="var(--color-border)"
            tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
          {CONTEXT_BUCKETS.map((bucket) => (
            <Bar
              key={bucket}
              dataKey={bucket}
              name={bucket}
              stackId="day"
              fill={CONTEXT_BUCKET_COLOR_VAR[bucket]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
