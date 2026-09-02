import type { CvNamespace } from "@/features/ocr/seven-segment/opencv-loader";
import type { BBox, CvMat } from "@/features/ocr/seven-segment/types";

/** Fragmentos com gap horizontal menor que isto (relativo à altura média) são fundidos numa única célula de dígito. */
export const FRAGMENT_MERGE_GAP_RATIO = 0.35;

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

    if (gap < FRAGMENT_MERGE_GAP_RATIO * avgHeight && overlapsVertically(last, box)) {
      cells[cells.length - 1] = unionBBox(last, box);
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

  try {
    cv.findContours(thresholdedMat, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const boxes: BBox[] = [];
    for (let i = 0; i < contours.size(); i += 1) {
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
    contours.delete();
    hierarchy.delete();
  }
}
