import type { RangeClassification } from "@/features/measurements/classify";

const STYLES: Record<RangeClassification, string> = {
  abaixo: "bg-status-below/10 text-status-below",
  dentro: "bg-status-within/10 text-status-within",
  acima: "bg-status-above/10 text-status-above",
};

const ICONS: Record<RangeClassification, string> = {
  abaixo: "↓",
  dentro: "✓",
  acima: "↑",
};

const SHORT_LABELS: Record<RangeClassification, string> = {
  abaixo: "Abaixo",
  dentro: "Dentro",
  acima: "Acima",
};

export function ClassificationBadge({ classification }: { classification: RangeClassification }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[classification]}`}
      title={`${SHORT_LABELS[classification]} da faixa configurada`}
    >
      <span aria-hidden="true">{ICONS[classification]}</span>
      {SHORT_LABELS[classification]}
    </span>
  );
}
