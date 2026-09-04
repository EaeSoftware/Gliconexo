import type { CvNamespace } from "@/features/ocr/seven-segment/opencv-loader";
import type { BBox, CvMat } from "@/features/ocr/seven-segment/types";

/** Fragmentos com gap horizontal menor que isto (relativo à altura média) são fundidos numa única célula de dígito. */
export const FRAGMENT_MERGE_GAP_RATIO = 0.35;

/** A fusao de fragmentos nao pode produzir uma caixa larga demais para ser um unico digito. */
export const FRAGMENT_MERGE_MAX_UNION_ASPECT_RATIO = 0.95;

function overlapsVertically(a: BBox, b: BBox): boolean {
  const aTop = a.y;
  const aBottom = a.y + a.height;
  const bTop = b.y;
  const bBottom = b.y + b.height;
  return aTop < bBottom && bTop < aBottom;
}

function unionBBox(a: BBox, b: BBox): BBox {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function aspectRatio(box: BBox): number {
  return box.height > 0 ? box.width / box.height : Number.POSITIVE_INFINITY;
}

/**
 * Funde fragmentos horizontalmente próximos e verticalmente
 * sobrepostos numa única célula de dígito — necessário porque dígitos
 * como "4" ou "1" podem gerar mais de um contorno desconectado. Função
 * pura, testável sem OpenCV.
 */
export function splitIntoDigitCells(boxes: BBox[]): BBox[] {
  if (boxes.length === 0) return [];

  const sorted = [...boxes].sort((a, b) => a.x - b.x);
  const cells: BBox[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i += 1) {
    const box = sorted[i];
    const last = cells[cells.length - 1];
    const gap = box.x - (last.x + last.width);
    const avgHeight = (last.height + box.height) / 2;

    const merged = unionBBox(last, box);
    if (
      gap < FRAGMENT_MERGE_GAP_RATIO * avgHeight &&
      overlapsVertically(last, box) &&
      aspectRatio(merged) <= FRAGMENT_MERGE_MAX_UNION_ASPECT_RATIO
    ) {
      cells[cells.length - 1] = merged;
    } else {
      cells.push(box);
    }
  }

  return cells;
}

/**
 * Segmenta a ROI binarizada do número principal em células de dígito
 * individuais, ordenadas da esquerda para a direita.
 */
export function segmentDigitCells(cv: CvNamespace, thresholdedMat: CvMat): BBox[] {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const gray = new cv.Mat();
  const contourSource = new cv.Mat();

  try {
    cv.cvtColor(thresholdedMat, gray, cv.COLOR_RGBA2GRAY);
    // `preprocessForThreshold` deixa o fundo claro do LCD como 255 e os
    // digitos escuros como 0. `findContours` procura blobs brancos,
    // entao inverte apenas a fonte dos contornos; o buffer original
    // continua sendo usado por `readSegmentStates`, que ja detecta a
    // polaridade da celula.
    cv.threshold(gray, contourSource, 127, 255, cv.THRESH_BINARY_INV);
    cv.findContours(contourSource, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const boxes: BBox[] = [];
    const contourCount = contours.size();
    for (let i = 0; i < contourCount; i += 1) {
      const contour = contours.get(i);
      try {
        const rect = cv.boundingRect(contour);
        boxes.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      } finally {
        contour.delete();
      }
    }

    return splitIntoDigitCells(boxes);
  } finally {
    contourSource.delete();
    gray.delete();
    contours.delete();
    hierarchy.delete();
  }
}
