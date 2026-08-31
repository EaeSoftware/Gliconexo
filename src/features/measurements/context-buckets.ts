import type { MeasurementContext } from "@/features/measurements/constants";

/**
 * Os 9 contextos de medição (CLAUDE.md, seção 10.5) são agrupados em 5
 * "baldes" para os gráficos por contexto de Análises (CLAUDE.md, seção
 * 10.11: "series por cafe da manha, almoco, lanche da tarde, jantar e
 * outros contextos"). Contextos sem uma refeição principal associada
 * (jejum, antes de dormir, madrugada, atividade física, outro) caem
 * todos em "Outros contextos".
 */
export const CONTEXT_BUCKETS = [
  "cafe_da_manha",
  "almoco",
  "lanche_da_tarde",
  "jantar",
  "outros",
] as const;

export type ContextBucket = (typeof CONTEXT_BUCKETS)[number];

export const CONTEXT_BUCKET_LABELS: Record<ContextBucket, string> = {
  cafe_da_manha: "Café da manhã",
  almoco: "Almoço",
  lanche_da_tarde: "Lanche da tarde",
  jantar: "Jantar",
  outros: "Outros contextos",
};

/** Nome do token CSS categórico (definido em globals.css) para cada balde. */
export const CONTEXT_BUCKET_COLOR_VAR: Record<ContextBucket, string> = {
  cafe_da_manha: "var(--color-series-context-1)",
  almoco: "var(--color-series-context-2)",
  lanche_da_tarde: "var(--color-series-context-3)",
  jantar: "var(--color-series-context-4)",
  outros: "var(--color-series-context-5)",
};

export function bucketForContext(context: MeasurementContext): ContextBucket {
  switch (context) {
    case "cafe_da_manha":
      return "cafe_da_manha";
    case "almoco":
      return "almoco";
    case "lanche_da_tarde":
      return "lanche_da_tarde";
    case "jantar":
      return "jantar";
    default:
      return "outros";
  }
}
