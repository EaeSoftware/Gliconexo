import { describe, expect, it } from "vitest";
import {
  buildMeasurementTableRows,
  buildPdfPhotoEntries,
  buildReportSummaryRows,
  MAX_PDF_PHOTOS,
  measurementTableHeaders,
  periodLabel,
} from "@/features/reports/pdf";
import { computeMeasurementStats, computeRangeDistribution } from "@/features/measurements/stats";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";

function makeMeasurement(overrides: Partial<GlucoseMeasurement>): GlucoseMeasurement {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    valueMgDl: 110,
    measuredAt: "2026-08-28T11:30:00.000Z",
    timezone: "America/Sao_Paulo",
    context: "cafe_da_manha",
    mealRelation: "depois",
    source: "manual",
    version: 1,
    createdAt: "2026-08-28T11:30:00.000Z",
    updatedAt: "2026-08-28T11:30:00.000Z",
    ...overrides,
  };
}

describe("periodLabel", () => {
  it("traduz cada período suportado", () => {
    expect(periodLabel(7)).toBe("Últimos 7 dias");
    expect(periodLabel("all")).toBe("Todo o histórico");
  });
});

describe("buildReportSummaryRows", () => {
  it("mostra apenas a contagem quando não há medições", () => {
    const rows = buildReportSummaryRows(computeMeasurementStats([]), null);
    expect(rows).toEqual([["Medições no período", "0"]]);
  });

  it("inclui média, mínimo, máximo e última medição quando há dados", () => {
    const measurements = [
      makeMeasurement({ valueMgDl: 90, measuredAt: "2026-08-20T08:00:00.000Z" }),
      makeMeasurement({ valueMgDl: 130, measuredAt: "2026-08-27T08:00:00.000Z" }),
    ];
    const rows = buildReportSummaryRows(computeMeasurementStats(measurements), null);
    const labels = rows.map(([label]) => label);

    expect(labels).toContain("Média");
    expect(labels).toContain("Mínimo");
    expect(labels).toContain("Máximo");
    expect(labels).toContain("Última medição");
    expect(labels).not.toContain("Distribuição na faixa");
  });

  it("inclui a distribuição na faixa apenas quando uma faixa está configurada", () => {
    const measurements = [makeMeasurement({ valueMgDl: 200 })];
    const targetRange = { targetMinMgDl: 70, targetMaxMgDl: 180 };
    const rows = buildReportSummaryRows(
      computeMeasurementStats(measurements),
      computeRangeDistribution(measurements, targetRange),
    );

    const distributionRow = rows.find(([label]) => label === "Distribuição na faixa");
    expect(distributionRow?.[1]).toContain("100% acima");
  });
});

describe("measurementTableHeaders", () => {
  it("omite a coluna de observação quando includeNotes é false", () => {
    expect(measurementTableHeaders(false)).not.toContain("Observação");
  });

  it("inclui a coluna de observação quando includeNotes é true", () => {
    expect(measurementTableHeaders(true)).toContain("Observação");
  });
});

describe("buildMeasurementTableRows", () => {
  it("ordena da mais antiga para a mais recente", () => {
    const older = makeMeasurement({ id: "older", measuredAt: "2026-08-20T08:00:00.000Z" });
    const newer = makeMeasurement({ id: "newer", measuredAt: "2026-08-27T08:00:00.000Z" });

    const rows = buildMeasurementTableRows([newer, older], {
      includeNotes: false,
      targetRange: null,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0][0]).not.toBe(rows[1][0]);
  });

  it("não inclui coluna de observação quando includeNotes é false, mesmo com notas presentes", () => {
    const measurement = makeMeasurement({ notes: "Depois de correr" });
    const rows = buildMeasurementTableRows([measurement], {
      includeNotes: false,
      targetRange: null,
    });
    expect(rows[0]).not.toContain("Depois de correr");
  });

  it("inclui a observação como última coluna quando includeNotes é true", () => {
    const measurement = makeMeasurement({ notes: "Depois de correr" });
    const rows = buildMeasurementTableRows([measurement], {
      includeNotes: true,
      targetRange: null,
    });
    expect(rows[0].at(-1)).toBe("Depois de correr");
  });

  it("classifica a medição quando há faixa configurada, e nunca inventa uma faixa quando não há", () => {
    const measurement = makeMeasurement({ valueMgDl: 200 });
    const withoutRange = buildMeasurementTableRows([measurement], {
      includeNotes: false,
      targetRange: null,
    });
    const withRange = buildMeasurementTableRows([measurement], {
      includeNotes: false,
      targetRange: { targetMinMgDl: 70, targetMaxMgDl: 180 },
    });

    expect(withoutRange[0]).toContain("—");
    expect(withRange[0]).toContain("Acima da faixa configurada");
  });

  it("traduz contexto, relação com a refeição e origem", () => {
    const measurement = makeMeasurement({
      context: "jejum",
      mealRelation: "antes",
      source: "ocr",
    });
    const row = buildMeasurementTableRows([measurement], {
      includeNotes: false,
      targetRange: null,
    })[0];

    expect(row).toContain("Jejum");
    expect(row).toContain("Antes da refeição");
    expect(row).toContain("Câmera (OCR)");
  });
});

describe("buildPdfPhotoEntries", () => {
  const photos = (...ids: string[]) => new Map(ids.map((id) => [id, `data:image/jpeg;base64,${id}`]));

  it("inclui só medições que têm foto, da mais antiga para a mais recente", () => {
    const old = makeMeasurement({ id: "a", measuredAt: "2026-08-20T08:00:00.000Z" });
    const withoutPhoto = makeMeasurement({ id: "b", measuredAt: "2026-08-22T08:00:00.000Z" });
    const recent = makeMeasurement({ id: "c", measuredAt: "2026-08-27T08:00:00.000Z" });

    const { photos: entries, omitted } = buildPdfPhotoEntries(
      [recent, withoutPhoto, old],
      photos("a", "c"),
    );

    expect(entries.map((entry) => entry.dataUrl)).toEqual([
      "data:image/jpeg;base64,a",
      "data:image/jpeg;base64,c",
    ]);
    expect(omitted).toBe(0);
  });

  it("legenda traz valor e a confiança do OCR quando existe", () => {
    const measurement = makeMeasurement({
      id: "a",
      valueMgDl: 103,
      source: "ocr",
      ocrConfidence: 0.9,
    });
    const low = makeMeasurement({ id: "b", valueMgDl: 99, source: "ocr", ocrConfidence: 0.5 });

    const { photos: entries } = buildPdfPhotoEntries([measurement, low], photos("a", "b"));

    expect(entries[0].caption).toContain("103 mg/dL");
    expect(entries[0].caption).toContain("confiança alta");
    expect(entries[1].caption).toContain("confiança baixa");
  });

  it("não inventa confiança para medição manual", () => {
    const manual = makeMeasurement({ id: "a", source: "manual" });

    const { photos: entries } = buildPdfPhotoEntries([manual], photos("a"));

    expect(entries[0].caption).not.toContain("confiança");
  });

  it("respeita o teto de fotos e informa quantas ficaram de fora", () => {
    const many = Array.from({ length: MAX_PDF_PHOTOS + 5 }, (_, index) =>
      makeMeasurement({
        id: `m${index}`,
        measuredAt: new Date(Date.UTC(2026, 7, 1, 8, index)).toISOString(),
      }),
    );

    const { photos: entries, omitted } = buildPdfPhotoEntries(
      many,
      photos(...many.map((measurement) => measurement.id)),
    );

    expect(entries).toHaveLength(MAX_PDF_PHOTOS);
    expect(omitted).toBe(5);
  });

  it("devolve vazio quando nenhuma medição tem foto", () => {
    expect(buildPdfPhotoEntries([makeMeasurement({ id: "a" })], new Map())).toEqual({
      photos: [],
      omitted: 0,
    });
  });
});

describe("buildMeasurementsPdf com fotos e gráfico por hora", () => {
  async function pdfText(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob, "latin1");
    });
  }

  async function makeImages() {
    const { createCanvas } = await import("canvas");
    const jpeg = createCanvas(160, 80);
    jpeg.getContext("2d").fillRect(0, 0, 160, 80);
    const png = createCanvas(80, 32);
    png.getContext("2d").fillRect(0, 0, 80, 32);
    return {
      jpeg: jpeg.toDataURL("image/jpeg"),
      png: png.toDataURL("image/png"),
    };
  }

  const stats = (measurements: GlucoseMeasurement[]) => ({
    stats: computeMeasurementStats(measurements),
    distribution: null,
  });

  it("gera o PDF com as fotos e o gráfico por hora sem quebrar", async () => {
    const { buildMeasurementsPdf } = await import("@/features/reports/pdf");
    const { jpeg, png } = await makeImages();
    const measurements = Array.from({ length: 8 }, (_, index) =>
      makeMeasurement({
        id: `m${index}`,
        source: "ocr",
        ocrConfidence: 0.9,
        measuredAt: new Date(Date.UTC(2026, 7, 1 + index, 11)).toISOString(),
      }),
    );
    const { photos, omitted } = buildPdfPhotoEntries(
      measurements,
      new Map(measurements.map((measurement) => [measurement.id, jpeg])),
    );

    const blob = await buildMeasurementsPdf(measurements, stats(measurements), {
      includeNotes: false,
      period: 30,
      targetRange: null,
      chartImageDataUrl: png,
      hourlyChartImageDataUrl: png,
      photos,
      omittedPhotos: omitted,
    });

    expect(blob.size).toBeGreaterThan(1000);
    expect(await pdfText(blob)).toMatch(/^%PDF-/);
  });

  it("o PDF com fotos é maior que o mesmo PDF sem fotos", async () => {
    const { buildMeasurementsPdf } = await import("@/features/reports/pdf");
    const { jpeg } = await makeImages();
    const measurements = [makeMeasurement({ id: "a", source: "ocr", ocrConfidence: 0.9 })];
    const base = { includeNotes: false, period: 30 as const, targetRange: null, chartImageDataUrl: null };

    const without = await buildMeasurementsPdf(measurements, stats(measurements), base);
    const withPhoto = await buildMeasurementsPdf(measurements, stats(measurements), {
      ...base,
      photos: buildPdfPhotoEntries(measurements, new Map([["a", jpeg]])).photos,
    });

    expect(withPhoto.size).toBeGreaterThan(without.size);
  });

  it("continua gerando o PDF sem tabela (nenhuma medição) e sem imagens", async () => {
    const { buildMeasurementsPdf } = await import("@/features/reports/pdf");

    const blob = await buildMeasurementsPdf([], stats([]), {
      includeNotes: false,
      period: 7,
      targetRange: null,
      chartImageDataUrl: null,
    });

    expect(await pdfText(blob)).toMatch(/^%PDF-/);
  });
});
