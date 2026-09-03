import type { CvNamespace } from "@/features/ocr/seven-segment/opencv-loader";
import type { CvMat, DisplayQuad, Point } from "@/features/ocr/seven-segment/types";

/** Um contorno candidato precisa cobrir pelo menos esta fração da área da imagem para ser considerado o visor. */
const MIN_QUAD_AREA_RATIO = 0.15;

/**
 * Um contorno candidato precisa preencher pelo menos esta fração da
 * área do seu próprio retângulo delimitador para ser considerado
 * "razoavelmente retangular" — descarta silhuetas irregulares (dedos,
 * sombras, texto) sem exigir um polígono de exatamente 4 vértices.
 */
const MIN_RECTANGULARITY_RATIO = 0.55;

/**
 * Detecta a região do visor dentro da imagem já recortada manualmente
 * pelo usuário (ver `image-editor.tsx`) — não a foto inteira.
 *
 * Usa segmentação por região (limiar de Otsu), não detecção de bordas
 * (Canny): testado contra fotos reais, o traçado do Canny em torno do
 * visor sai fragmentado (baixo contraste/reflexo no LCD) e nunca fecha
 * num contorno grande o bastante, mesmo com dilatação. Já a diferença
 * de brilho entre o LCD (claro) e a moldura escura ao redor é forte e
 * consistente, então o limiar de Otsu isola essa região de forma
 * confiável como um blob conectado.
 *
 * Retorna `null` (nunca lança) se nenhum contorno plausível for
 * encontrado — o chamador deve então pular a correção de perspectiva e
 * seguir com a imagem como está.
 */
export function detectDisplayQuad(cv: CvNamespace, mat: CvMat): DisplayQuad | null {
  const imageArea = mat.cols * mat.rows;
  if (imageArea === 0) return null;

  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const thresholded = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    // Sem inverter: o LCD (claro) vira o primeiro-plano (255); a
    // moldura escura do aparelho vira fundo (0) e separa o LCD de
    // qualquer outra área clara (mesa/parede) que apareça nos cantos
    // do recorte, mesmo que ambas caiam na mesma classe de brilho.
    cv.threshold(gray, thresholded, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let best: Point[] | null = null;
    let bestArea = 0;
    const borderMargin = Math.max(2, Math.round(Math.min(mat.cols, mat.rows) * 0.01));

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      try {
        const area = cv.contourArea(contour);
        if (area < imageArea * MIN_QUAD_AREA_RATIO || area <= bestArea) continue;

        const rect = cv.boundingRect(contour);
        const rectArea = rect.width * rect.height;
        if (rectArea === 0 || area / rectArea < MIN_RECTANGULARITY_RATIO) continue;

        // O visor fica cercado pela moldura escura do aparelho — uma
        // região clara que encosta na borda do recorte é o fundo
        // (mesa/parede) vazando pelos cantos, não o LCD, mesmo quando
        // maior e igualmente "retangular".
        const touchesBorder =
          rect.x <= borderMargin ||
          rect.y <= borderMargin ||
          rect.x + rect.width >= mat.cols - borderMargin ||
          rect.y + rect.height >= mat.rows - borderMargin;
        if (touchesBorder) continue;

        best = [
          { x: rect.x, y: rect.y },
          { x: rect.x + rect.width, y: rect.y },
          { x: rect.x + rect.width, y: rect.y + rect.height },
          { x: rect.x, y: rect.y + rect.height },
        ];
        bestArea = area;
      } finally {
        contour.delete();
      }
    }

    return best ? { corners: best as [Point, Point, Point, Point] } : null;
  } finally {
    gray.delete();
    blurred.delete();
    thresholded.delete();
    contours.delete();
    hierarchy.delete();
  }
}
