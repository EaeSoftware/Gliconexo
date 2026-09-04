import { loadImageDataFromUrl, imageDataToBlob } from "@/features/ocr/canvas-utils";
import { preprocessForThreshold, THRESHOLD_LEVELS, type PixelBuffer } from "@/features/ocr/preprocess";
import { HIGH_CONFIDENCE } from "@/features/ocr/run-ocr-pipeline";
import type { OcrProgress } from "@/features/ocr/tesseract-provider";
import type { PSM } from "tesseract.js";
import type { OcrProvider, OcrResult } from "@/features/ocr/types";
import { correctPerspective } from "@/features/ocr/seven-segment/correct-perspective";
import { decodeDigit, readSegmentStates } from "@/features/ocr/seven-segment/decode-seven-segment";
import { detectDisplayQuad } from "@/features/ocr/seven-segment/detect-display";
import { segmentDigitCells } from "@/features/ocr/seven-segment/detect-digits";
import { cropMatToBBox, findMainReadingCluster } from "@/features/ocr/seven-segment/crop-main-reading";
import { createOcrFallback } from "@/features/ocr/seven-segment/ocr-fallback";
import { loadOpenCv, type CvNamespace, type OpenCvProgress } from "@/features/ocr/seven-segment/opencv-loader";
import { matToPixelBuffer, pixelBufferToMat } from "@/features/ocr/seven-segment/preprocess-display";
import { emitDebugStage } from "@/features/ocr/seven-segment/debug";
import type { CvMat, DecodedDigit, SevenSegmentDebugHooks } from "@/features/ocr/seven-segment/types";
import { validateDecodedNumber } from "@/features/ocr/seven-segment/validate-result";

const ENGINE_VERSION = "seven-segment@1";
const ENGINE_VERSION_WITH_FALLBACK = "seven-segment@1+tesseract-fallback";

const EMPTY_RESULT: OcrResult = { value: null, confidence: 0, candidates: [], engineVersion: ENGINE_VERSION };

type DecodeAttempt = {
  buffer: PixelBuffer;
};

function oddAtLeast(value: number, min: number): number {
  const rounded = Math.max(min, Math.round(value));
  return rounded % 2 === 1 ? rounded : rounded + 1;
}

function adaptiveThresholdAttempt(cv: CvNamespace, roiMat: CvMat, blockSize: number): DecodeAttempt {
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const thresholded = new cv.Mat();

  try {
    cv.cvtColor(roiMat, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0);
    cv.adaptiveThreshold(
      blurred,
      thresholded,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      blockSize,
      10,
    );

    return {
      buffer: matToPixelBuffer(cv, thresholded),
    };
  } finally {
    thresholded.delete();
    blurred.delete();
    gray.delete();
  }
}

export type SevenSegmentProviderOptions = {
  onProgress?: (progress: OpenCvProgress | OcrProgress) => void;
  debug?: SevenSegmentDebugHooks;
};

/**
 * `OcrProvider` dedicado a displays de 7 segmentos (glicosímetros
 * digitais). Detecta o visor, corrige perspectiva, isola o número
 * grande central (ignorando horário/contador de memória), decodifica
 * dígito a dígito por padrão de segmentos e, se isso falhar, cai para
 * OCR genérico restrito à mesma região recortada.
 *
 * Nunca rejeita: qualquer falha em qualquer etapa resolve com
 * `{ value: null, confidence: 0 }`, para que uma falha de OCR nunca
 * bloqueie a entrada manual (CLAUDE.md, regra de negócio 15).
 */
export class SevenSegmentOcrProvider implements OcrProvider {
  private readonly options: SevenSegmentProviderOptions;
  private readonly fallback: ReturnType<typeof createOcrFallback>;

  constructor(options: SevenSegmentProviderOptions = {}) {
    this.options = options;
    this.fallback = createOcrFallback(options.onProgress);
  }

  async recognize(input: Blob): Promise<OcrResult> {
    try {
      return await this.recognizeInternal(input);
    } catch {
      return EMPTY_RESULT;
    }
  }

  private async recognizeInternal(input: Blob): Promise<OcrResult> {
    const cv = await loadOpenCv(this.options.onProgress);
    const url = URL.createObjectURL(input);

    try {
      const imageData = await loadImageDataFromUrl(url);
      let mat: CvMat = cv.matFromImageData(imageData);
      emitDebugStage(cv, this.options.debug, "original", mat);

      try {
        const quad = detectDisplayQuad(cv, mat);
        if (quad) {
          const corrected = correctPerspective(cv, mat, quad);
          if (corrected !== mat) {
            mat.delete();
            mat = corrected;
          }
        }
        emitDebugStage(cv, this.options.debug, "display_detectado", mat);

        const cluster = findMainReadingCluster(cv, mat);
        if (!cluster) {
          // Sem cluster, o fallback roda sobre o recorte inteiro do
          // usuário (pode ter horário, contador de memória, "mg/dL"
          // além do número principal) — `SPARSE_TEXT` deixa o Tesseract
          // segmentar essas várias regiões de texto em vez de tentar
          // (e falhar) ler tudo como uma única linha.
          return await this.recognizeWithFallback(cv, mat, "sparse");
        }

        const roiMat = cropMatToBBox(mat, cluster.bbox);
        emitDebugStage(cv, this.options.debug, "roi_numero", roiMat);

        try {
          // A decodificação por segmentos usa Mats/operações nativas do
          // OpenCV que podem lançar (não só retornar `null`) diante de
          // um cluster degenerado (bbox implausível vindo da heurística
          // de contornos) — trata isso como "falhou", não deixa a
          // exceção escapar e pular o fallback de OCR genérico abaixo.
          let decoded: { value: number | null; confidence: number };
          try {
            decoded = this.decodeAcrossThresholds(cv, roiMat);
          } catch {
            decoded = { value: null, confidence: 0 };
          }

          if (decoded.value !== null) {
            return {
              value: decoded.value,
              confidence: decoded.confidence,
              candidates: [],
              engineVersion: ENGINE_VERSION,
            };
          }
          return await this.recognizeWithFallback(cv, roiMat, "single-line");
        } finally {
          roiMat.delete();
        }
      } finally {
        mat.delete();
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** Testa limiares globais primeiro e, se necessario, tentativas adaptativas locais. */
  private decodeAcrossThresholds(cv: CvNamespace, roiMat: CvMat): { value: number | null; confidence: number } {
    let best: { value: number | null; confidence: number } = { value: null, confidence: 0 };
    const processAttempt = (attempt: DecodeAttempt): void => {
      const processedMat = pixelBufferToMat(cv, attempt.buffer);
      emitDebugStage(cv, this.options.debug, "threshold", processedMat);

      try {
        const digitCells = segmentDigitCells(cv, processedMat);
        const digits: DecodedDigit[] = digitCells.map((cellBBox) => {
          const { segments, confidence } = readSegmentStates(attempt.buffer, cellBBox);
          return decodeDigit(segments, cellBBox, confidence);
        });

        emitDebugStage(cv, this.options.debug, "digitos_detectados", processedMat);

        const result = validateDecodedNumber(digits);
        if (result.value !== null && result.confidence > best.confidence) {
          best = result;
        }
      } catch {
        // Segue para o próximo nível de limiar.
      } finally {
        processedMat.delete();
      }
    };

    const buffer = matToPixelBuffer(cv, roiMat);
    for (const level of THRESHOLD_LEVELS) {
      processAttempt({ buffer: preprocessForThreshold(buffer, level) });
      if (best.value !== null && best.confidence >= HIGH_CONFIDENCE) break;
    }

    if (best.value === null || best.confidence < HIGH_CONFIDENCE) {
      const minDimension = Math.min(roiMat.cols, roiMat.rows);
      const blockSizes = [
        oddAtLeast(Math.round(minDimension / 4), 21),
        oddAtLeast(Math.round(minDimension / 10), 11),
      ];

      for (const blockSize of blockSizes) {
        processAttempt(adaptiveThresholdAttempt(cv, roiMat, blockSize));
        if (best.value !== null && best.confidence >= HIGH_CONFIDENCE) break;
      }
    }

    return best;
  }

  /** Fallback: OCR genérico (Tesseract) sobre o mat recebido (ROI isolada, ou o recorte inteiro quando não há cluster). */
  private async recognizeWithFallback(
    cv: CvNamespace,
    roiMat: CvMat,
    mode: "single-line" | "sparse",
  ): Promise<OcrResult> {
    const buffer = matToPixelBuffer(cv, roiMat);
    const roiBlob = await imageDataToBlob(buffer);
    const { PSM } = await import("tesseract.js");
    const psm: PSM = mode === "sparse" ? PSM.SPARSE_TEXT : PSM.SINGLE_LINE;
    const result = await this.fallback.recognize(roiBlob, psm);
    return { ...result, engineVersion: ENGINE_VERSION_WITH_FALLBACK };
  }

  /** Libera os workers/recursos usados (Tesseract de fallback). Chamar ao sair da tela de captura. */
  async terminate(): Promise<void> {
    await this.fallback.terminate();
  }
}
