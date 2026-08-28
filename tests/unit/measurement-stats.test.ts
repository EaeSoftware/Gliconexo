import { describe, expect, it } from "vitest";
import { computeMeasurementStats } from "@/features/measurements/stats";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";

function makeMeasurement(overrides: Partial<GlucoseMeasurement>): GlucoseMeasurement {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    valueMgDl: 100,
    measuredAt: "2026-08-28T08:00:00.000Z",
    timezone: "America/Sao_Paulo",
    context: "outro",
    mealRelation: "nao_informado",
    source: "manual",
    version: 1,
    createdAt: "2026-08-28T08:00:00.000Z",
    updatedAt: "2026-08-28T08:00:00.000Z",
    ...overrides,
  };
}

describe("computeMeasurementStats", () => {
  it("retorna zeros/nulos para lista vazia", () => {
    expect(computeMeasurementStats([])).toEqual({
      count: 0,
      average: null,
      min: null,
      max: null,
      last: null,
    });
  });

  it("calcula média, mínimo, máximo e total", () => {
    const measurements = [
      makeMeasurement({ id: "a", valueMgDl: 100, measuredAt: "2026-08-26T08:00:00.000Z" }),
      makeMeasurement({ id: "b", valueMgDl: 150, measuredAt: "2026-08-27T08:00:00.000Z" }),
      makeMeasurement({ id: "c", valueMgDl: 90, measuredAt: "2026-08-28T08:00:00.000Z" }),
    ];

    const stats = computeMeasurementStats(measurements);

    expect(stats.count).toBe(3);
    expect(stats.average).toBeCloseTo(113.3, 1);
    expect(stats.min).toBe(90);
    expect(stats.max).toBe(150);
    expect(stats.last?.id).toBe("c");
  });

  it("identifica a última medição pela data, não pela ordem da lista", () => {
    const measurements = [
      makeMeasurement({ id: "newest", measuredAt: "2026-08-28T08:00:00.000Z" }),
      makeMeasurement({ id: "oldest", measuredAt: "2026-08-01T08:00:00.000Z" }),
    ];

    expect(computeMeasurementStats(measurements).last?.id).toBe("newest");
  });
});
