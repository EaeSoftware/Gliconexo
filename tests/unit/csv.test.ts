import { describe, expect, it } from "vitest";
import { buildMeasurementsCsv, escapeCsvField } from "@/features/reports/csv";
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

describe("escapeCsvField", () => {
  it("não altera valores simples", () => {
    expect(escapeCsvField("Manual")).toBe("Manual");
  });

  it("envolve em aspas quando há vírgula", () => {
    expect(escapeCsvField("a, b")).toBe('"a, b"');
  });

  it("dobra aspas internas e envolve o campo", () => {
    expect(escapeCsvField('disse "oi"')).toBe('"disse ""oi"""');
  });

  it("envolve em aspas quando há quebra de linha", () => {
    expect(escapeCsvField("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });
});

describe("buildMeasurementsCsv", () => {
  it("gera o cabeçalho em português mesmo sem medições", () => {
    const csv = buildMeasurementsCsv([]);
    expect(csv).toBe(
      "Data e hora (ISO),Data e hora (local),Valor,Unidade,Contexto,Relação com a refeição,Origem,Observação",
    );
  });

  it("inclui uma linha por medição, ordenada da mais antiga para a mais recente", () => {
    const older = makeMeasurement({ id: "older", measuredAt: "2026-08-20T08:00:00.000Z" });
    const newer = makeMeasurement({ id: "newer", measuredAt: "2026-08-27T08:00:00.000Z" });

    const csv = buildMeasurementsCsv([newer, older]);
    const lines = csv.split("\r\n");

    expect(lines).toHaveLength(3); // cabeçalho + 2 linhas
    expect(lines[1]).toContain("2026-08-20T08:00:00.000Z");
    expect(lines[2]).toContain("2026-08-27T08:00:00.000Z");
  });

  it("omite a observação por padrão, mesmo quando presente na medição", () => {
    const measurement = makeMeasurement({ notes: "Depois de correr" });
    const csv = buildMeasurementsCsv([measurement]);
    expect(csv).not.toContain("Depois de correr");
  });

  it("inclui a observação quando includeNotes é true", () => {
    const measurement = makeMeasurement({ notes: "Depois de correr" });
    const csv = buildMeasurementsCsv([measurement], { includeNotes: true });
    expect(csv).toContain("Depois de correr");
  });

  it("escapa uma observação com vírgula quando incluída", () => {
    const measurement = makeMeasurement({ notes: "café, sem açúcar" });
    const csv = buildMeasurementsCsv([measurement], { includeNotes: true });
    expect(csv).toContain('"café, sem açúcar"');
  });

  it("usa mg/dL como unidade e traduz origem/contexto/refeição", () => {
    const measurement = makeMeasurement({
      valueMgDl: 95,
      context: "jejum",
      mealRelation: "antes",
      source: "ocr",
    });
    const csv = buildMeasurementsCsv([measurement]);
    expect(csv).toContain("95,mg/dL,Jejum,Antes da refeição,Câmera (OCR)");
  });
});
