import { describe, expect, it } from "vitest";
import {
  buildAggregatedSeries,
  buildContextSeriesPoints,
  buildDailyContextCounts,
} from "@/features/measurements/chart-data";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";

function makeMeasurement(overrides: Partial<GlucoseMeasurement>): GlucoseMeasurement {
  const now = "2026-08-28T12:00:00.000Z";
  return {
    id: overrides.id ?? crypto.randomUUID(),
    valueMgDl: 100,
    measuredAt: now,
    timezone: "America/Sao_Paulo",
    context: "outro",
    mealRelation: "nao_informado",
    source: "manual",
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("buildContextSeriesPoints", () => {
  it("coloca o valor apenas na chave do balde do próprio contexto", () => {
    const points = buildContextSeriesPoints([
      makeMeasurement({ context: "almoco", valueMgDl: 120, measuredAt: "2026-08-01T12:00:00.000Z" }),
      makeMeasurement({ context: "jejum", valueMgDl: 90, measuredAt: "2026-08-02T07:00:00.000Z" }),
    ]);

    expect(points).toHaveLength(2);
    expect(points[0].almoco).toBe(120);
    expect(points[0].outros).toBeUndefined();
    expect(points[1].outros).toBe(90);
    expect(points[1].almoco).toBeUndefined();
  });

  it("ordena por horário crescente", () => {
    const points = buildContextSeriesPoints([
      makeMeasurement({ measuredAt: "2026-08-02T12:00:00.000Z" }),
      makeMeasurement({ measuredAt: "2026-08-01T12:00:00.000Z" }),
    ]);
    expect(points[0].timestamp).toBeLessThan(points[1].timestamp);
  });
});

describe("buildDailyContextCounts", () => {
  it("conta medições por dia e por balde de contexto", () => {
    const result = buildDailyContextCounts([
      makeMeasurement({ context: "cafe_da_manha", measuredAt: "2026-08-01T08:00:00.000Z" }),
      makeMeasurement({ context: "cafe_da_manha", measuredAt: "2026-08-01T08:30:00.000Z" }),
      makeMeasurement({ context: "jantar", measuredAt: "2026-08-01T20:00:00.000Z" }),
      makeMeasurement({ context: "almoco", measuredAt: "2026-08-02T12:00:00.000Z" }),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].cafe_da_manha).toBe(2);
    expect(result[0].jantar).toBe(1);
    expect(result[0].almoco).toBe(0);
    expect(result[1].almoco).toBe(1);
  });

  it("não inventa dias sem nenhuma medição", () => {
    const result = buildDailyContextCounts([
      makeMeasurement({ measuredAt: "2026-08-01T08:00:00.000Z" }),
      makeMeasurement({ measuredAt: "2026-08-10T08:00:00.000Z" }),
    ]);
    expect(result).toHaveLength(2);
  });

  it("ordena por dia crescente", () => {
    const result = buildDailyContextCounts([
      makeMeasurement({ measuredAt: "2026-08-05T08:00:00.000Z" }),
      makeMeasurement({ measuredAt: "2026-08-01T08:00:00.000Z" }),
    ]);
    expect(result[0].dateKey < result[1].dateKey).toBe(true);
  });

  it("retorna lista vazia sem medições", () => {
    expect(buildDailyContextCounts([])).toEqual([]);
  });
});

describe("buildAggregatedSeries", () => {
  it("agrupa por dia e calcula média/mínimo/máximo/contagem", () => {
    const result = buildAggregatedSeries(
      [
        makeMeasurement({ valueMgDl: 100, measuredAt: "2026-08-01T08:00:00.000Z" }),
        makeMeasurement({ valueMgDl: 120, measuredAt: "2026-08-01T20:00:00.000Z" }),
        makeMeasurement({ valueMgDl: 90, measuredAt: "2026-08-02T08:00:00.000Z" }),
      ],
      "day",
    );

    expect(result).toHaveLength(2);
    expect(result[0].average).toBe(110);
    expect(result[0].min).toBe(100);
    expect(result[0].max).toBe(120);
    expect(result[0].count).toBe(2);
    expect(result[1].average).toBe(90);
  });

  it("agrupa por mês", () => {
    const result = buildAggregatedSeries(
      [
        makeMeasurement({ valueMgDl: 100, measuredAt: "2026-08-01T12:00:00.000Z" }),
        makeMeasurement({ valueMgDl: 140, measuredAt: "2026-08-20T12:00:00.000Z" }),
        makeMeasurement({ valueMgDl: 80, measuredAt: "2026-09-05T12:00:00.000Z" }),
      ],
      "month",
    );

    expect(result).toHaveLength(2);
    expect(result[0].average).toBe(120);
    expect(result[0].count).toBe(2);
    expect(result[1].average).toBe(80);
  });

  it("agrupa por semana ISO, mesmo atravessando a virada do ano", () => {
    const result = buildAggregatedSeries(
      [
        makeMeasurement({ valueMgDl: 100, measuredAt: "2025-12-30T12:00:00.000Z" }),
        makeMeasurement({ valueMgDl: 110, measuredAt: "2025-12-31T12:00:00.000Z" }),
        makeMeasurement({ valueMgDl: 90, measuredAt: "2026-01-07T12:00:00.000Z" }),
      ],
      "week",
    );

    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(2);
    expect(result[0].average).toBe(105);
    expect(result[1].count).toBe(1);
  });

  it("nunca inventa baldes sem medições", () => {
    const result = buildAggregatedSeries(
      [
        makeMeasurement({ measuredAt: "2026-08-01T12:00:00.000Z" }),
        makeMeasurement({ measuredAt: "2026-10-01T12:00:00.000Z" }),
      ],
      "month",
    );
    expect(result).toHaveLength(2);
  });

  it("ordena os baldes por timestamp crescente", () => {
    const result = buildAggregatedSeries(
      [
        makeMeasurement({ measuredAt: "2026-08-05T12:00:00.000Z" }),
        makeMeasurement({ measuredAt: "2026-08-01T12:00:00.000Z" }),
      ],
      "day",
    );
    expect(result[0].timestamp).toBeLessThan(result[1].timestamp);
  });

  it("retorna lista vazia sem medições", () => {
    expect(buildAggregatedSeries([], "day")).toEqual([]);
  });
});
