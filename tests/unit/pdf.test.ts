import { describe, expect, it } from "vitest";
import {
  buildMeasurementTableRows,
  buildReportSummaryRows,
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
