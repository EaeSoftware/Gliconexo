import { preprocessForThreshold, type PixelBuffer } from "@/features/ocr/preprocess";
import type { CvNamespace } from "@/features/ocr/seven-segment/opencv-loader";
import type { CvMat } from "@/features/ocr/seven-segment/types";

/**
 * Lê um `cv.Mat` RGBA (`CV_8UC4`) para o formato `PixelBuffer` usado
 * pelas funções puras já testadas em `preprocess.ts`.
 *
 * Passa por um `<canvas>` (`cv.imshow` + `getImageData`) em vez de
 * copiar `mat.data` diretamente: um `Mat` que veio de `roi().clone()`
 * pode reportar `data.length` do tamanho "esperado" (`cols*rows*canais`)
 * mas com o conteúdo internamente desalinhado — `step` (stride real por
 * linha) inconsistente com `cols*canais`, e `isContinuous()` `false` —
 * o que produz uma imagem com linhas embaralhadas na leitura direta.
 * `cv.imshow` é o caminho de I/O do próprio OpenCV.js e lida com esse
 * stride corretamente.
 */
export function matToPixelBuffer(cv: CvNamespace, mat: CvMat): PixelBuffer {
  const canvas = document.createElement("canvas");
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  cv.imshow(canvas, mat);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível para ler pixels de cv.Mat");

  const imageData = ctx.getImageData(0, 0, mat.cols, mat.rows);
  return {
    width: mat.cols,
    height: mat.rows,
    data: imageData.data,
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
  const buffer = matToPixelBuffer(cv, mat);
  const processed = preprocessForThreshold(buffer, level);
  return pixelBufferToMat(cv, processed);
}
