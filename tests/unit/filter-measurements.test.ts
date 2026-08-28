import { describe, expect, it } from "vitest";
import {
  filterMeasurements,
  groupMeasurementsByDay,
  DEFAULT_MEASUREMENT_FILTERS,
  type MeasurementListFilters,
} from "@/features/measurements/filter-measurements";
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

describe("filterMeasurements", () => {
  const recent = makeMeasurement({ id: "recent", measuredAt: NOW.toISOString() });
  const tenDaysAgo = makeMeasurement({
    id: "ten-days-ago",
    measuredAt: new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const list = [recent, tenDaysAgo];

  it("filtra por período em dias", () => {
    const result = filterMeasurements(list, { ...DEFAULT_MEASUREMENT_FILTERS, period: 7 }, NOW);
    expect(result.map((m) => m.id)).toEqual(["recent"]);
  });

  it("mantém tudo quando o período é 'all'", () => {
    const filters: MeasurementListFilters = { period: "all", context: "all", origin: "all", range: "all" };
    const result = filterMeasurements(list, filters, NOW);
    expect(result).toHaveLength(2);
  });

  it("filtra por contexto", () => {
    const withContext = [
      makeMeasurement({ id: "jejum", context: "jejum" }),
      makeMeasurement({ id: "almoco", context: "almoco" }),
    ];
    const result = filterMeasurements(
      withContext,
      { period: "all", context: "jejum", origin: "all", range: "all" },
      NOW,
    );
    expect(result.map((m) => m.id)).toEqual(["jejum"]);
  });

  it("filtra por período personalizado (from/to)", () => {
    const inRange = makeMeasurement({ id: "in-range", measuredAt: "2026-08-15T12:00:00.000Z" });
    const before = makeMeasurement({ id: "before", measuredAt: "2026-08-01T12:00:00.000Z" });
    const after = makeMeasurement({ id: "after", measuredAt: "2026-08-25T12:00:00.000Z" });

    const result = filterMeasurements(
      [inRange, before, after],
      {
        period: "custom",
        customFrom: "2026-08-10",
        customTo: "2026-08-20",
        context: "all",
        origin: "all",
        range: "all",
      },
      NOW,
    );

    expect(result.map((m) => m.id)).toEqual(["in-range"]);
  });

  it("filtra por origem", () => {
    const withOrigin = [
      makeMeasurement({ id: "manual-1", source: "manual" }),
      makeMeasurement({ id: "ocr-1", source: "ocr" }),
    ];
    const result = filterMeasurements(
      withOrigin,
      { period: "all", context: "all", origin: "ocr", range: "all" },
      NOW,
    );
    expect(result.map((m) => m.id)).toEqual(["ocr-1"]);
  });

  it("filtra por faixa quando uma faixa pessoal está configurada", () => {
    const withValues = [
      makeMeasurement({ id: "low", valueMgDl: 60 }),
      makeMeasurement({ id: "mid", valueMgDl: 120 }),
      makeMeasurement({ id: "high", valueMgDl: 200 }),
    ];
    const targetRange = { targetMinMgDl: 70, targetMaxMgDl: 180 };

    const result = filterMeasurements(
      withValues,
      { period: "all", context: "all", origin: "all", range: "acima" },
      NOW,
      targetRange,
    );

    expect(result.map((m) => m.id)).toEqual(["high"]);
  });

  it("não filtra por faixa quando nenhuma faixa foi configurada", () => {
    const withValues = [
      makeMeasurement({ id: "low", valueMgDl: 60 }),
      makeMeasurement({ id: "high", valueMgDl: 200 }),
    ];

    const result = filterMeasurements(
      withValues,
      { period: "all", context: "all", origin: "all", range: "acima" },
      NOW,
      null,
    );

    expect(result).toHaveLength(0);
  });
});

describe("groupMeasurementsByDay", () => {
  it("agrupa medições do mesmo dia local e ordena do mais recente para o mais antigo", () => {
    const day1a = makeMeasurement({ id: "day1a", measuredAt: "2026-08-28T09:00:00.000Z" });
    const day1b = makeMeasurement({ id: "day1b", measuredAt: "2026-08-28T18:00:00.000Z" });
    const day2 = makeMeasurement({ id: "day2", measuredAt: "2026-08-27T09:00:00.000Z" });

    const groups = groupMeasurementsByDay([day1a, day1b, day2]);

    expect(groups).toHaveLength(2);
    expect(groups[0].measurements.map((m) => m.id).sort()).toEqual(["day1a", "day1b"]);
    expect(groups[1].measurements.map((m) => m.id)).toEqual(["day2"]);
  });

  it("retorna lista vazia para entrada vazia", () => {
    expect(groupMeasurementsByDay([])).toEqual([]);
  });
});
