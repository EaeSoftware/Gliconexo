import { CONTEXT_BUCKETS, CONTEXT_BUCKET_COLOR_VAR, CONTEXT_BUCKET_LABELS } from "@/features/measurements/context-buckets";

/**
 * Legenda própria (em vez da legenda nativa do Recharts) para garantir a
 * ordem categórica fixa — café da manhã, almoço, lanche da tarde,
 * jantar, outros — em vez de uma ordem incidental de renderização.
 */
export function ContextBucketLegend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">
      {CONTEXT_BUCKETS.map((bucket) => (
        <li key={bucket} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CONTEXT_BUCKET_COLOR_VAR[bucket] }}
          />
          {CONTEXT_BUCKET_LABELS[bucket]}
        </li>
      ))}
    </ul>
  );
}
