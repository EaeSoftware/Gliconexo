"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RangeDistribution } from "@/features/measurements/stats";
import { RANGE_CLASSIFICATION_LABELS, type RangeClassification } from "@/features/measurements/classify";

const SLICE_ORDER: RangeClassification[] = ["abaixo", "dentro", "acima"];

const SLICE_COLOR_VAR: Record<RangeClassification, string> = {
  abaixo: "var(--color-status-below)",
  dentro: "var(--color-status-within)",
  acima: "var(--color-status-above)",
};

type SlicePayload = { classification: RangeClassification; pct: number };

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: SlicePayload }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0].payload;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-foreground">{RANGE_CLASSIFICATION_LABELS[slice.classification]}</p>
      <p className="text-foreground/60">{slice.pct}% das medições do período</p>
    </div>
  );
}

type GlucosePieChartProps = {
  distribution: RangeDistribution;
};

export default function GlucosePieChart({ distribution }: GlucosePieChartProps) {
  const pctByClassification: Record<RangeClassification, number> = {
    abaixo: distribution.belowPct,
    dentro: distribution.withinPct,
    acima: distribution.abovePct,
  };

  const data: SlicePayload[] = SLICE_ORDER.filter((classification) => pctByClassification[classification] > 0).map(
    (classification) => ({ classification, pct: pctByClassification[classification] }),
  );

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={data}
            dataKey="pct"
            nameKey="classification"
            innerRadius={60}
            outerRadius={100}
            isAnimationActive={false}
          >
            {data.map((slice) => (
              <Cell key={slice.classification} fill={SLICE_COLOR_VAR[slice.classification]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
