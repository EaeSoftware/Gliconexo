import { describe, expect, it } from "vitest";
import { buildHourlyGlucoseProfile, hourOfDay } from "@/features/measurements/chart-data";
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

describe("hourOfDay", () => {
  it("lê a hora no fuso informado, não em UTC", () => {
    // 12:00 UTC = 09:00 em São Paulo (UTC-3, sem horário de verão em 2026)
    expect(hourOfDay(new Date("2026-08-28T12:00:00.000Z"), "America/Sao_Paulo")).toBe(9);
    expect(hourOfDay(new Date("2026-08-28T12:00:00.000Z"), "UTC")).toBe(12);
  });

  it("trata a meia-noite como hora 0 e não 24", () => {
    expect(hourOfDay(new Date("2026-08-28T03:00:00.000Z"), "America/Sao_Paulo")).toBe(0);
    expect(hourOfDay(new Date("2026-08-28T02:59:00.000Z"), "America/Sao_Paulo")).toBe(23);
  });

  it("não quebra com fuso inválido e cai para o fuso do dispositivo", () => {
    const hour = hourOfDay(new Date("2026-08-28T12:00:00.000Z"), "Nao/Existe");
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });
});

describe("buildHourlyGlucoseProfile", () => {
  it("agrupa medições de dias diferentes pela mesma hora", () => {
    const points = buildHourlyGlucoseProfile([
      makeMeasurement({ measuredAt: "2026-08-01T11:00:00.000Z", valueMgDl: 100 }), // 08h
      makeMeasurement({ measuredAt: "2026-08-02T11:30:00.000Z", valueMgDl: 140 }), // 08h
      makeMeasurement({ measuredAt: "2026-08-03T11:10:00.000Z", valueMgDl: 120 }), // 08h
    ]);

    expect(points).toEqual([
      { hour: 8, label: "08h", average: 120, min: 100, max: 140, count: 3 },
    ]);
  });

  it("omite horas sem medição em vez de preencher com zero", () => {
    const points = buildHourlyGlucoseProfile([
      makeMeasurement({ measuredAt: "2026-08-01T10:00:00.000Z" }), // 07h
      makeMeasurement({ measuredAt: "2026-08-01T22:00:00.000Z" }), // 19h
    ]);

    expect(points.map((point) => point.hour)).toEqual([7, 19]);
  });

  it("ordena por hora crescente mesmo com entrada desordenada", () => {
    const points = buildHourlyGlucoseProfile([
      makeMeasurement({ measuredAt: "2026-08-01T22:00:00.000Z" }), // 19h
      makeMeasurement({ measuredAt: "2026-08-01T10:00:00.000Z" }), // 07h
      makeMeasurement({ measuredAt: "2026-08-01T15:00:00.000Z" }), // 12h
    ]);

    expect(points.map((point) => point.hour)).toEqual([7, 12, 19]);
  });

  it("usa o fuso gravado em cada medição", () => {
    const points = buildHourlyGlucoseProfile([
      makeMeasurement({ measuredAt: "2026-08-01T12:00:00.000Z", timezone: "America/Sao_Paulo" }), // 09h
      makeMeasurement({ measuredAt: "2026-08-01T12:00:00.000Z", timezone: "UTC" }), // 12h
    ]);

    expect(points.map((point) => point.hour)).toEqual([9, 12]);
  });

  it("o fuso explícito tem prioridade sobre o fuso gravado", () => {
    const points = buildHourlyGlucoseProfile(
      [makeMeasurement({ measuredAt: "2026-08-01T12:00:00.000Z", timezone: "America/Sao_Paulo" })],
      "UTC",
    );

    expect(points.map((point) => point.hour)).toEqual([12]);
  });

  it("arredonda a média para uma casa decimal", () => {
    const points = buildHourlyGlucoseProfile([
      makeMeasurement({ measuredAt: "2026-08-01T11:00:00.000Z", valueMgDl: 100 }),
      makeMeasurement({ measuredAt: "2026-08-02T11:00:00.000Z", valueMgDl: 101 }),
      makeMeasurement({ measuredAt: "2026-08-03T11:00:00.000Z", valueMgDl: 101 }),
    ]);

    expect(points[0].average).toBe(100.7);
  });

  it("devolve lista vazia sem medições", () => {
    expect(buildHourlyGlucoseProfile([])).toEqual([]);
  });
});
