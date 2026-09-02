import { describe, expect, it } from "vitest";
import {
  decodeDigit,
  SEGMENT_DIGIT_TABLE,
  segmentStateKey,
} from "@/features/ocr/seven-segment/decode-seven-segment";
import type { BBox, SegmentState } from "@/features/ocr/seven-segment/types";

const WIDE_CELL: BBox = { x: 0, y: 0, width: 30, height: 40 };
const NARROW_CELL: BBox = { x: 0, y: 0, width: 8, height: 40 };

function segmentsFromKey(key: string): SegmentState {
  const [top, topLeft, topRight, middle, bottomLeft, bottomRight, bottom] = key.split("").map((v) => v === "1");
  return { top, topLeft, topRight, middle, bottomLeft, bottomRight, bottom };
}

const ALL_OFF: SegmentState = {
  top: false,
  topLeft: false,
  topRight: false,
  middle: false,
  bottomLeft: false,
  bottomRight: false,
  bottom: false,
};

describe("segmentStateKey", () => {
  it("concatena os segmentos na ordem fixa top,topLeft,topRight,middle,bottomLeft,bottomRight,bottom", () => {
    expect(segmentStateKey({ ...ALL_OFF, top: true, bottom: true })).toBe("1000001");
  });
});

describe("decodeDigit", () => {
  it.each(Object.entries(SEGMENT_DIGIT_TABLE))("decodifica o padrão %s como dígito %s", (key, expected) => {
    const result = decodeDigit(segmentsFromKey(key), WIDE_CELL, 0.9);
    expect(result.char).toBe(expected);
  });

  it("trata célula estreita como dígito '1' independente do padrão de segmentos", () => {
    const result = decodeDigit(ALL_OFF, NARROW_CELL, 0.9);
    expect(result.char).toBe("1");
  });

  it("rejeita (null) um traço isolado (apenas middle) — sinal negativo/ícone, não um dígito", () => {
    const result = decodeDigit(segmentsFromKey("0001000"), WIDE_CELL, 0.9);
    expect(result.char).toBeNull();
  });

  it("rejeita (null) padrões desconhecidos em vez de adivinhar", () => {
    const result = decodeDigit(ALL_OFF, WIDE_CELL, 0.9);
    expect(result.char).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it("preserva a confiança amostrada quando o dígito é reconhecido", () => {
    const result = decodeDigit(segmentsFromKey("1111110"), WIDE_CELL, 0.73);
    expect(result.confidence).toBe(0.73);
  });
});
