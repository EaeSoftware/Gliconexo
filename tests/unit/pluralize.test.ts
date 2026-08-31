import { describe, expect, it } from "vitest";
import { formatMeasurementCount } from "@/features/measurements/pluralize";

describe("formatMeasurementCount", () => {
  it("usa singular para 1", () => {
    expect(formatMeasurementCount(1)).toBe("1 medição");
  });

  it("usa plural para 0 e para mais de 1", () => {
    expect(formatMeasurementCount(0)).toBe("0 medições");
    expect(formatMeasurementCount(4)).toBe("4 medições");
  });

  it("adiciona 'confirmada'/'confirmadas' quando solicitado", () => {
    expect(formatMeasurementCount(1, { confirmed: true })).toBe("1 medição confirmada");
    expect(formatMeasurementCount(3, { confirmed: true })).toBe("3 medições confirmadas");
  });
});
