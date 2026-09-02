import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import type { MeasurementStats, RangeDistribution } from "@/features/measurements/stats";
import { classifyValue, RANGE_CLASSIFICATION_LABELS, type TargetRange } from "@/features/measurements/classify";
import {
  MEASUREMENT_CONTEXT_LABELS,
  MEAL_RELATION_LABELS,
} from "@/features/measurements/constants";
import type { PeriodFilter } from "@/features/measurements/filter-measurements";

function formatLocalDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  7: "Últimos 7 dias",
  30: "Últimos 30 dias",
  90: "Últimos 90 dias",
  all: "Todo o histórico",
  custom: "Período personalizado",
};

export function periodLabel(period: PeriodFilter): string {
  return PERIOD_LABELS[period];
}

/**
 * Linhas rótulo/valor do resumo numérico do relatório. Função pura —
 * reaproveita os cálculos já existentes de `computeMeasurementStats` /
 * `computeRangeDistribution` (CLAUDE.md, seção 17, regras 5 e 9: nada
 * de interpolar dias sem dados nem projetar tendência aqui).
 */
export function buildReportSummaryRows(
  stats: MeasurementStats,
  distribution: RangeDistribution | null,
): [string, string][] {
  const rows: [string, string][] = [
    ["Medições no período", String(stats.count)],
  ];

  if (stats.count === 0) {
    return rows;
  }

  rows.push(
    ["Média", `${stats.average} mg/dL`],
    ["Mínimo", `${stats.min} mg/dL`],
    ["Máximo", `${stats.max} mg/dL`],
  );

  if (stats.last) {
    rows.push(["Última medição", `${stats.last.valueMgDl} mg/dL em ${formatLocalDateTime(stats.last.measuredAt)}`]);
  }

  if (distribution) {
    rows.push([
      "Distribuição na faixa",
      `${distribution.belowPct}% abaixo · ${distribution.withinPct}% dentro · ${distribution.abovePct}% acima`,
    ]);
  }

  return rows;
}

export type BuildTableRowsOptions = {
  includeNotes: boolean;
  targetRange: TargetRange | null;
};

/**
 * Linhas da tabela cronológica de medições, na ordem mais antiga →
 * mais recente (mesma ordenação de `buildMeasurementsCsv`). A coluna
 * de observação só é incluída quando `includeNotes` é true — nunca
 * exportar observações sem o usuário marcar essa opção (CLAUDE.md,
 * seção 10.12).
 */
export function buildMeasurementTableRows(
  measurements: GlucoseMeasurement[],
  options: BuildTableRowsOptions,
): string[][] {
  return [...measurements]
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .map((measurement) => {
      const classification = classifyValue(measurement.valueMgDl, options.targetRange);
      const row = [
        formatLocalDateTime(measurement.measuredAt),
        `${measurement.valueMgDl} mg/dL`,
        MEASUREMENT_CONTEXT_LABELS[measurement.context],
        MEAL_RELATION_LABELS[measurement.mealRelation],
        classification ? RANGE_CLASSIFICATION_LABELS[classification] : "—",
        measurement.source === "ocr" ? "Câmera (OCR)" : "Manual",
      ];
      if (options.includeNotes) {
        row.push(measurement.notes ?? "");
      }
      return row;
    });
}

export function measurementTableHeaders(includeNotes: boolean): string[] {
  const headers = ["Data e hora", "Valor", "Contexto", "Relação com a refeição", "Faixa", "Origem"];
  if (includeNotes) headers.push("Observação");
  return headers;
}

export type BuildPdfOptions = {
  includeNotes: boolean;
  identification?: string;
  period: PeriodFilter;
  targetRange: TargetRange | null;
  chartImageDataUrl: string | null;
  generatedAt?: Date;
};

export type BuildPdfStatsInput = {
  stats: MeasurementStats;
  distribution: RangeDistribution | null;
};

const MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 em pt
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const DISCLAIMER =
  "Este documento é informativo, gerado a partir dos registros do usuário no GlicoNexo, e não substitui avaliação, diagnóstico ou prescrição de um profissional de saúde.";

function targetRangeLine(targetRange: TargetRange | null): string {
  if (targetRange?.targetMinMgDl == null || targetRange?.targetMaxMgDl == null) {
    return "Faixa configurada: não configurada.";
  }
  return `Faixa configurada: ${targetRange.targetMinMgDl}–${targetRange.targetMaxMgDl} mg/dL.`;
}

/**
 * Monta o PDF do relatório (CLAUDE.md, seção 10.12): título,
 * identificação opcional, período, data/hora de geração, resumo
 * numérico, gráfico principal, tabela cronológica, faixa configurada e
 * aviso informativo. Importa `jspdf`/`jspdf-autotable` sob demanda —
 * mesmo padrão de lazy-load usado para `tesseract.js` — para não
 * inflar o bundle inicial do PWA.
 */
export async function buildMeasurementsPdf(
  measurements: GlucoseMeasurement[],
  { stats, distribution }: BuildPdfStatsInput,
  options: BuildPdfOptions,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const generatedAt = options.generatedAt ?? new Date();

  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GlicoNexo", MARGIN, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (options.identification) {
    doc.text(options.identification, MARGIN, y);
    y += 14;
  }
  doc.text(periodLabel(options.period), MARGIN, y);
  y += 14;
  doc.text(`Gerado em ${formatLocalDateTime(generatedAt.toISOString())}`, MARGIN, y);
  y += 20;

  doc.setFontSize(11);
  for (const [label, value] of buildReportSummaryRows(stats, distribution)) {
    doc.text(`${label}: ${value}`, MARGIN, y);
    y += 15;
  }
  y += 8;

  if (options.chartImageDataUrl) {
    const chartHeight = (CONTENT_WIDTH * 320) / 800;
    doc.addImage(options.chartImageDataUrl, "PNG", MARGIN, y, CONTENT_WIDTH, chartHeight);
    y += chartHeight + 20;
  }

  doc.setFontSize(10);
  doc.text(targetRangeLine(options.targetRange), MARGIN, y);
  y += 16;

  const drawFooter = () => {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(DISCLAIMER, MARGIN, pageHeight - 24, { maxWidth: CONTENT_WIDTH });
    doc.setTextColor(0);
  };

  if (measurements.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [measurementTableHeaders(options.includeNotes)],
      body: buildMeasurementTableRows(measurements, {
        includeNotes: options.includeNotes,
        targetRange: options.targetRange,
      }),
      margin: { left: MARGIN, right: MARGIN, bottom: 48 },
      showHead: "everyPage",
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 154, 243] },
      didDrawPage: drawFooter,
    });
  } else {
    drawFooter();
  }

  return doc.output("blob");
}
