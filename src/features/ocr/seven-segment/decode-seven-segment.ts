import type { PixelBuffer } from "@/features/ocr/preprocess";
import type { BBox, DecodedDigit, SegmentState } from "@/features/ocr/seven-segment/types";

type SegmentKey = keyof SegmentState;
type SegmentRegion = { x: [number, number]; y: [number, number] };

/**
 * Janelas de amostragem de cada segmento, em coordenadas proporcionais
 * (0-1) dentro da célula do dígito. Constantes nomeadas para facilitar
 * calibração com fotos reais de aparelhos durante a implementação.
 */
export const SEGMENT_REGIONS: Record<SegmentKey, SegmentRegion> = {
  top: { x: [0.25, 0.75], y: [0.05, 0.2] },
  topLeft: { x: [0.05, 0.25], y: [0.15, 0.45] },
  topRight: { x: [0.75, 0.95], y: [0.15, 0.45] },
  middle: { x: [0.25, 0.75], y: [0.42, 0.58] },
  bottomLeft: { x: [0.05, 0.25], y: [0.55, 0.85] },
  bottomRight: { x: [0.75, 0.95], y: [0.55, 0.85] },
  bottom: { x: [0.25, 0.75], y: [0.8, 0.95] },
};

/** Fração mínima de pixels "acesos" numa janela de amostragem para considerar o segmento ativo. */
export const SEGMENT_ON_RATIO_THRESHOLD = 0.35;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Fração de pixels brancos (valor 255) dentro de uma região proporcional da célula, num buffer já binarizado (0/255). */
function sampleWhiteRatio(buffer: PixelBuffer, cellBBox: BBox, region: SegmentRegion): number {
  const x0 = Math.round(cellBBox.x + region.x[0] * cellBBox.width);
  const x1 = Math.round(cellBBox.x + region.x[1] * cellBBox.width);
  const y0 = Math.round(cellBBox.y + region.y[0] * cellBBox.height);
  const y1 = Math.round(cellBBox.y + region.y[1] * cellBBox.height);

  let white = 0;
  let total = 0;
  for (let y = y0; y < y1; y += 1) {
    if (y < 0 || y >= buffer.height) continue;
    for (let x = x0; x < x1; x += 1) {
      if (x < 0 || x >= buffer.width) continue;
      const i = (y * buffer.width + x) * 4;
      if (buffer.data[i] === 255) white += 1;
      total += 1;
    }
  }
  return total > 0 ? white / total : 0;
}

/**
 * Amostra o estado dos 7 segmentos de uma célula de dígito num buffer
 * já binarizado (0/255, via `preprocessForThreshold`). A polaridade
 * (segmentos claros sobre fundo escuro, ou o contrário) é detectada
 * automaticamente pela proporção de branco na célula inteira — o fundo
 * sempre domina a área de uma célula de 7 segmentos, então a cor
 * majoritária é o fundo, não os traços do segmento.
 */
export function readSegmentStates(buffer: PixelBuffer, cellBBox: BBox): { segments: SegmentState; confidence: number } {
  const wholeCellWhiteRatio = sampleWhiteRatio(buffer, cellBBox, { x: [0, 1], y: [0, 1] });
  const backgroundIsWhite = wholeCellWhiteRatio > 0.5;

  const segments = {} as SegmentState;
  let marginSum = 0;

  for (const key of Object.keys(SEGMENT_REGIONS) as SegmentKey[]) {
    const whiteRatio = sampleWhiteRatio(buffer, cellBBox, SEGMENT_REGIONS[key]);
    const litRatio = backgroundIsWhite ? 1 - whiteRatio : whiteRatio;
    segments[key] = litRatio >= SEGMENT_ON_RATIO_THRESHOLD;
    marginSum += Math.abs(litRatio - SEGMENT_ON_RATIO_THRESHOLD);
  }

  const confidence = clamp01(marginSum / Object.keys(SEGMENT_REGIONS).length / SEGMENT_ON_RATIO_THRESHOLD);
  return { segments, confidence };
}

/**
 * Célula mais estreita que este limite (largura/altura) é tratada como
 * o dígito "1" independentemente do padrão de segmentos amostrado —
 * fisicamente ocupa menos espaço que os demais dígitos em displays de
 * 7 segmentos reais.
 */
export const DIGIT_ONE_ASPECT_RATIO_THRESHOLD = 0.4;

/**
 * Chave canônica: concatenação booleana na ordem fixa (top, topLeft,
 * topRight, middle, bottomLeft, bottomRight, bottom) usada para
 * consultar `SEGMENT_DIGIT_TABLE`.
 */
export function segmentStateKey(segments: SegmentState): string {
  const { top, topLeft, topRight, middle, bottomLeft, bottomRight, bottom } = segments;
  return [top, topLeft, topRight, middle, bottomLeft, bottomRight, bottom].map((v) => (v ? "1" : "0")).join("");
}

/**
 * Mapeamento tradicional de 7 segmentos para dígitos 0-9. Padrões que
 * não aparecem aqui (ponto decimal, ícone de bateria, traço/sinal
 * negativo — `middle` sozinho) são intencionalmente omitidos: nunca
 * devem ser "chutados" como um dígito.
 */
export const SEGMENT_DIGIT_TABLE: Record<string, string> = {
  "1111110": "0",
  "1011101": "2",
  "1111101": "3",
  "0110011": "4",
  "1101011": "5",
  "1101111": "6",
  "1110000": "7",
  "1111111": "8",
  "1111011": "9",
};

/**
 * Decodifica o estado de segmentos de uma célula em um dígito.
 * Nunca "chuta": qualquer padrão fora da tabela (e fora do caso
 * especial do dígito "1") resulta em `char: null`.
 */
export function decodeDigit(segments: SegmentState, cellBBox: BBox, segmentConfidence: number): DecodedDigit {
  const aspectRatio = cellBBox.height > 0 ? cellBBox.width / cellBBox.height : 0;

  if (aspectRatio < DIGIT_ONE_ASPECT_RATIO_THRESHOLD) {
    return { char: "1", segments, confidence: segmentConfidence };
  }

  const key = segmentStateKey(segments);
  const char = SEGMENT_DIGIT_TABLE[key] ?? null;
  return { char, segments, confidence: char !== null ? segmentConfidence : 0 };
}
