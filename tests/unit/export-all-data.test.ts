import { describe, expect, it } from "vitest";
import { buildAllDataExport } from "@/features/privacy/export-all-data";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";

const NOW = new Date("2026-08-28T12:00:00.000Z");

function makeMeasurement(overrides: Partial<GlucoseMeasurement>): GlucoseMeasurement {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    valueMgDl: 100,
    measuredAt: NOW.toISOString(),
    timezone: "America/Sao_Paulo",
    context: "outro",
    mealRelation: "nao_informado",
    source: "manual",
    version: 1,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe("buildAllDataExport", () => {
  it("inclui metadados do formato e a data de exportação", () => {
    const result = buildAllDataExport([], null, NOW);
    expect(result.app).toBe("GlicoNexo");
    expect(result.exportFormatVersion).toBe(1);
    expect(result.exportedAt).toBe(NOW.toISOString());
  });

  it("exclui medições excluídas logicamente", () => {
    const active = makeMeasurement({ id: "active" });
    const deleted = makeMeasurement({ id: "deleted", deletedAt: NOW.toISOString() });

    const result = buildAllDataExport([active, deleted], null, NOW);

    expect(result.measurements.map((m) => m.id)).toEqual(["active"]);
  });

  it("retorna preferences null quando a faixa não está configurada", () => {
    const result = buildAllDataExport([], { id: "local", updatedAt: NOW.toISOString() }, NOW);
    expect(result.preferences).toBeNull();
  });

  it("inclui a faixa pessoal quando configurada", () => {
    const result = buildAllDataExport(
      [],
      { id: "local", targetMinMgDl: 70, targetMaxMgDl: 180, updatedAt: NOW.toISOString() },
      NOW,
    );
    expect(result.preferences).toEqual({ targetMinMgDl: 70, targetMaxMgDl: 180 });
  });
});
