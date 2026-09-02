import type { CvNamespace } from "@/features/ocr/seven-segment/opencv-loader";
import type { CvMat, DisplayQuad, Point } from "@/features/ocr/seven-segment/types";

/** Um contorno candidato precisa cobrir pelo menos esta fração da área da imagem para ser considerado o visor. */
const MIN_QUAD_AREA_RATIO = 0.4;

/**
 * Detecta o quadrilátero do visor dentro da imagem já recortada
 * manualmente pelo usuário (ver `image-editor.tsx`) — não a foto
 * inteira. Como um humano já excluiu a maior parte da mesa/corpo do
 * aparelho, "o maior contorno de 4 lados" é uma heurística robusta
 * aqui. Retorna `null` (nunca lança) se nenhum contorno plausível for
 * encontrado — o chamador deve então pular a correção de perspectiva e
 * seguir com a imagem como está.
 */
export function detectDisplayQuad(cv: CvNamespace, mat: CvMat): DisplayQuad | null {
  const imageArea = mat.cols * mat.rows;
  if (imageArea === 0) return null;

  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const approx = new cv.Mat();

  try {
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 50, 150);
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let best: Point[] | null = null;
    let bestArea = 0;

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      try {
        const area = cv.contourArea(contour);
        if (area < imageArea * MIN_QUAD_AREA_RATIO || area <= bestArea) continue;

        const perimeter = cv.arcLength(contour, true);
        cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);
        if (approx.rows !== 4) continue;

        const corners: Point[] = [];
        for (let p = 0; p < 4; p += 1) {
          corners.push({ x: approx.data32S[p * 2], y: approx.data32S[p * 2 + 1] });
        }

        best = corners;
        bestArea = area;
      } finally {
        contour.delete();
      }
    }

    return best ? { corners: best as [Point, Point, Point, Point] } : null;
  } finally {
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    approx.delete();
  }
}
