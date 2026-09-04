import { describe, expect, it } from "vitest";
import { splitIntoDigitCells } from "@/features/ocr/seven-segment/detect-digits";
import type { BBox } from "@/features/ocr/seven-segment/types";

describe("splitIntoDigitCells", () => {
  it("nao funde digitos completos adjacentes mesmo quando o espacamento entre eles e pequeno", () => {
    const boxesFromCleanSynthetic103: BBox[] = [
      { x: 21, y: 10, width: 75, height: 110 },
      { x: 110, y: 9, width: 85, height: 113 },
      { x: 211, y: 9, width: 74, height: 113 },
    ];

    const cells = splitIntoDigitCells(boxesFromCleanSynthetic103);

    expect(cells).toEqual(boxesFromCleanSynthetic103);
  });

  it("ainda funde fragmentos proximos quando a uniao continua parecendo um unico digito", () => {
    const fragmentsOfOneDigit: BBox[] = [
      { x: 20, y: 10, width: 16, height: 90 },
      { x: 42, y: 12, width: 18, height: 86 },
    ];

    const cells = splitIntoDigitCells(fragmentsOfOneDigit);

    expect(cells).toEqual([{ x: 20, y: 10, width: 40, height: 90 }]);
  });
});
