import type { CvNamespace } from "@/features/ocr/seven-segment/opencv-loader";
import type { CvMat, DisplayQuad, Point } from "@/features/ocr/seven-segment/types";

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Ordena 4 pontos quaisquer em TL, TR, BR, BL. Função pura — testável
 * sem OpenCV. Usa a soma (x+y) para achar TL (menor) e BR (maior), e a
 * diferença (x-y) para achar TR (maior) e BL (menor) — heurística
 * padrão para ordenar cantos de um quadrilátero aproximadamente
 * axis-aligned.
 */
export function orderQuadCorners(corners: [Point, Point, Point, Point]): [Point, Point, Point, Point] {
  const bySum = [...corners].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDiff = [...corners].sort((a, b) => a.x - a.y - (b.x - b.y));

  const topLeft = bySum[0];
  const bottomRight = bySum[3];
  const topRight = byDiff[3];
  const bottomLeft = byDiff[0];

  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * Corrige perspectiva/rotação do visor: recorta e "endireita" o
 * quadrilátero detectado por `detectDisplayQuad` para um retângulo
 * axis-aligned, usando `getPerspectiveTransform`/`warpPerspective`.
 */
export function correctPerspective(cv: CvNamespace, mat: CvMat, quad: DisplayQuad): CvMat {
  const [topLeft, topRight, bottomRight, bottomLeft] = orderQuadCorners(quad.corners);

  const width = Math.round(Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight)));
  const height = Math.round(Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight)));

  if (width <= 0 || height <= 0) return mat;

  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    topLeft.x,
    topLeft.y,
    topRight.x,
    topRight.y,
    bottomRight.x,
    bottomRight.y,
    bottomLeft.x,
    bottomLeft.y,
  ]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height]);
  const transform = cv.getPerspectiveTransform(srcTri, dstTri);
  const warped = new cv.Mat();

  try {
    cv.warpPerspective(mat, warped, transform, new cv.Size(width, height));
    return warped;
  } finally {
    srcTri.delete();
    dstTri.delete();
    transform.delete();
  }
}
