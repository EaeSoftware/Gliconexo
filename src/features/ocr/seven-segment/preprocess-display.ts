import { preprocessForThreshold, type PixelBuffer } from "@/features/ocr/preprocess";
import type { CvNamespace } from "@/features/ocr/seven-segment/opencv-loader";
import type { CvMat } from "@/features/ocr/seven-segment/types";

/** Lê um `cv.Mat` RGBA (`CV_8UC4`) para o formato `PixelBuffer` usado pelas funções puras já testadas em `preprocess.ts`. */
export function matToPixelBuffer(mat: CvMat): PixelBuffer {
  return {
    width: mat.cols,
    height: mat.rows,
    data: new Uint8ClampedArray(mat.data),
  };
}

/** Constrói um `cv.Mat` RGBA (`CV_8UC4`) a partir de um `PixelBuffer`. */
export function pixelBufferToMat(cv: CvNamespace, buffer: PixelBuffer): CvMat {
  const mat = new cv.Mat(buffer.height, buffer.width, cv.CV_8UC4);
  mat.data.set(buffer.data);
  return mat;
}

/**
 * Pré-processa a região do display (cinza -> contraste -> ruído ->
 * limiar) para um nível de limiar específico. Reaproveita as funções
 * puras já testadas de `preprocess.ts` em vez de duplicar a lógica em
 * OpenCV — o OpenCV só entra como ponte de/para `cv.Mat`.
 */
export function preprocessDisplayMat(cv: CvNamespace, mat: CvMat, level: number): CvMat {
  const buffer = matToPixelBuffer(mat);
  const processed = preprocessForThreshold(buffer, level);
  return pixelBufferToMat(cv, processed);
}
