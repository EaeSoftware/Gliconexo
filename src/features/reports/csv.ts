import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import {
  MEASUREMENT_CONTEXT_LABELS,
  MEAL_RELATION_LABELS,
} from "@/features/measurements/constants";

const CSV_HEADERS = [
  "Data e hora (ISO)",
  "Data e hora (local)",
  "Valor",
  "Unidade",
  "Contexto",
  "Relação com a refeição",
  "Origem",
  "Observação",
];

/**
 * Escapa um campo para CSV: envolve em aspas quando o valor contém
 * vírgula, aspas ou quebra de linha, dobrando aspas internas
 * (CLAUDE.md, seção 10.12).
 */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatLocalDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export type BuildCsvOptions = {
  /** Observações só entram no arquivo se o usuário marcar essa opção (CLAUDE.md, seção 10.12). */
  includeNotes?: boolean;
};

/**
 * Gera o conteúdo de um CSV (texto puro, UTF-8) a partir de uma lista
 * de medições já filtrada pelo período/formato escolhido pelo usuário.
 */
export function buildMeasurementsCsv(
  measurements: GlucoseMeasurement[],
  options: BuildCsvOptions = {},
): string {
  const rows = [...measurements]
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .map((measurement) =>
      [
        measurement.measuredAt,
        formatLocalDateTime(measurement.measuredAt),
        String(measurement.valueMgDl),
        "mg/dL",
        MEASUREMENT_CONTEXT_LABELS[measurement.context],
        MEAL_RELATION_LABELS[measurement.mealRelation],
        measurement.source === "ocr" ? "Câmera (OCR)" : "Manual",
        options.includeNotes ? (measurement.notes ?? "") : "",
      ]
        .map((field) => escapeCsvField(field))
        .join(","),
    );

  return [CSV_HEADERS.map(escapeCsvField).join(","), ...rows].join("\r\n");
}
