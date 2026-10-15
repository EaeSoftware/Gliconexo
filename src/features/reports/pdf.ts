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

/** Foto do visor já pronta para o PDF (JPEG em data URL) e a legenda que a acompanha. */
export type PdfPhoto = {
  dataUrl: string;
  caption: string;
};

/** Teto de fotos por documento: mantém o PDF leve e evita relatórios gigantes. */
export const MAX_PDF_PHOTOS = 40;

/**
 * Entradas da seção "Fotos do visor": só medições do período que têm foto,
 * da mais antiga para a mais recente (mesma ordem da tabela). `omitted`
 * conta as fotos que ficaram de fora por causa do teto `MAX_PDF_PHOTOS`
 * — o PDF avisa isso em vez de cortar em silêncio. Função pura.
 */
export function buildPdfPhotoEntries(
  measurements: GlucoseMeasurement[],
  photoDataUrls: Map<string, string>,
): { photos: PdfPhoto[]; omitted: number } {
  const withPhoto = [...measurements]
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .filter((measurement) => photoDataUrls.has(measurement.id));

  const photos = withPhoto.slice(0, MAX_PDF_PHOTOS).map((measurement) => {
    const parts = [formatLocalDateTime(measurement.measuredAt), `${measurement.valueMgDl} mg/dL`];
    if (measurement.source === "ocr" && measurement.ocrConfidence != null) {
      parts.push(`confiança ${measurement.ocrConfidence >= 0.7 ? "alta" : "baixa"}`);
    }
    return { dataUrl: photoDataUrls.get(measurement.id)!, caption: parts.join(" · ") };
  });

  return { photos, omitted: withPhoto.length - photos.length };
}

export type BuildPdfOptions = {
  includeNotes: boolean;
  identification?: string;
  period: PeriodFilter;
  targetRange: TargetRange | null;
  chartImageDataUrl: string | null;
  /** Gráfico por hora do dia (PNG em data URL); omitido do PDF quando ausente. */
  hourlyChartImageDataUrl?: string | null;
  /** Fotos do visor a incluir (opcional; só se o usuário marcou essa opção). */
  photos?: PdfPhoto[];
  /** Fotos que não couberam no teto `MAX_PDF_PHOTOS`. */
  omittedPhotos?: number;
  generatedAt?: Date;
};

export type BuildPdfStatsInput = {
  stats: MeasurementStats;
  distribution: RangeDistribution | null;
};

const MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 em pt
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
/** Espaço inferior reservado para o aviso informativo do rodapé. */
const FOOTER_RESERVE = 56;
const PHOTO_COLUMNS = 3;
const PHOTO_GAP = 12;
const PHOTO_MAX_HEIGHT = 110;
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
 * numérico, gráfico principal, gráfico por hora do dia, tabela
 * cronológica, fotos do visor (opcionais), faixa configurada e aviso
 * informativo. Importa `jspdf`/`jspdf-autotable` sob demanda —
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

  // `compress: true` é essencial: sem ele o jsPDF grava os PNGs dos gráficos sem compressão
  // (medido: 2 gráficos de 1600x640 viravam ~3 MB; com compressão, ~70 KB).
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
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

  // Idempotente por página: a tabela, as fotos e o fim do documento podem pedir o rodapé da mesma página.
  const footerPages = new Set<number>();
  const drawFooter = () => {
    const pageNumber = doc.getCurrentPageInfo().pageNumber;
    if (footerPages.has(pageNumber)) return;
    footerPages.add(pageNumber);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(DISCLAIMER, MARGIN, pageHeight - 24, { maxWidth: CONTENT_WIDTH });
    doc.setTextColor(0);
  };

  // Garante `height` pt livres na página atual; senão abre outra (com rodapé) e volta ao topo.
  const ensureSpace = (height: number) => {
    if (y + height > doc.internal.pageSize.getHeight() - FOOTER_RESERVE) {
      drawFooter();
      doc.addPage();
      y = MARGIN;
    }
  };

  const chartHeight = (CONTENT_WIDTH * 320) / 800;

  if (options.chartImageDataUrl) {
    ensureSpace(chartHeight);
    doc.addImage(options.chartImageDataUrl, "PNG", MARGIN, y, CONTENT_WIDTH, chartHeight);
    y += chartHeight + 20;
  }

  if (options.hourlyChartImageDataUrl) {
    ensureSpace(chartHeight + 16);
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(
      "Glicemia por hora do dia: média das medições de cada hora (pontos vazios = mínimo e máximo da hora).",
      MARGIN,
      y,
      { maxWidth: CONTENT_WIDTH },
    );
    doc.setTextColor(0);
    y += 12;
    doc.addImage(options.hourlyChartImageDataUrl, "PNG", MARGIN, y, CONTENT_WIDTH, chartHeight);
    y += chartHeight + 20;
  }

  ensureSpace(16);
  doc.setFontSize(10);
  doc.text(targetRangeLine(options.targetRange), MARGIN, y);
  y += 16;

  const hasTable = measurements.length > 0;
  if (hasTable) {
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
    const lastTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    y = (lastTable?.finalY ?? y) + 20;
  }

  const photos = options.photos ?? [];
  if (photos.length > 0) {
    ensureSpace(PHOTO_MAX_HEIGHT + 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Fotos do visor (OCR)", MARGIN, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(
      "Recortes do visor guardados pelo usuário no aparelho. Confira sempre o valor no próprio glicosímetro.",
      MARGIN,
      y,
      { maxWidth: CONTENT_WIDTH },
    );
    doc.setTextColor(0);
    y += 14;

    const cellWidth = (CONTENT_WIDTH - PHOTO_GAP * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS;

    for (let start = 0; start < photos.length; start += PHOTO_COLUMNS) {
      const row = photos.slice(start, start + PHOTO_COLUMNS);
      const sized = row.map((photo) => {
        const { width, height } = doc.getImageProperties(photo.dataUrl);
        const scale = Math.min(cellWidth / width, PHOTO_MAX_HEIGHT / height);
        return { photo, width: width * scale, height: height * scale };
      });
      const rowHeight = Math.max(...sized.map((item) => item.height)) + 26;

      ensureSpace(rowHeight);
      sized.forEach((item, column) => {
        const x = MARGIN + column * (cellWidth + PHOTO_GAP);
        doc.addImage(item.photo.dataUrl, "JPEG", x, y, item.width, item.height);
        doc.setFontSize(7);
        doc.text(item.photo.caption, x, y + item.height + 10, { maxWidth: cellWidth });
      });
      y += rowHeight;
    }

    if (options.omittedPhotos && options.omittedPhotos > 0) {
      ensureSpace(14);
      doc.setFontSize(8);
      doc.text(
        `${options.omittedPhotos} foto(s) a mais não couberam neste relatório (limite de ${MAX_PDF_PHOTOS}).`,
        MARGIN,
        y,
      );
    }
  }

  // Cobre a última página (sem tabela, ou com fotos depois dela); não repete onde já existe.
  drawFooter();

  return doc.output("blob");
}
