import { loadImageDataFromUrl, imageDataToBlob } from "@/features/ocr/canvas-utils";
import { preprocessForThreshold, THRESHOLD_LEVELS } from "@/features/ocr/preprocess";
import { HIGH_CONFIDENCE } from "@/features/ocr/run-ocr-pipeline";
import type { OcrProgress } from "@/features/ocr/tesseract-provider";
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
      emitDebugStage(this.options.debug, "original", mat);

      try {
        const quad = detectDisplayQuad(cv, mat);
        if (quad) {
          const corrected = correctPerspective(cv, mat, quad);
          if (corrected !== mat) {
            mat.delete();
            mat = corrected;
          }
        }
        emitDebugStage(this.options.debug, "display_detectado", mat);

        const cluster = findMainReadingCluster(cv, mat);
        if (!cluster) {
          return await this.recognizeWithFallback(mat);
        }

        const roiMat = cropMatToBBox(mat, cluster.bbox);
        emitDebugStage(this.options.debug, "roi_numero", roiMat);

        try {
          const decoded = this.decodeAcrossThresholds(cv, roiMat);
          if (decoded.value !== null) {
            return {
              value: decoded.value,
              confidence: decoded.confidence,
              candidates: [],
              engineVersion: ENGINE_VERSION,
            };
          }
          return await this.recognizeWithFallback(roiMat);
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

  /** Testa cada nível de limiar (mesmos usados hoje pelo pipeline genérico) até achar uma leitura válida de alta confiança. */
  private decodeAcrossThresholds(cv: CvNamespace, roiMat: CvMat): { value: number | null; confidence: number } {
    let best: { value: number | null; confidence: number } = { value: null, confidence: 0 };

    for (const level of THRESHOLD_LEVELS) {
      const buffer = matToPixelBuffer(roiMat);
      const processedBuffer = preprocessForThreshold(buffer, level);
      const processedMat = pixelBufferToMat(cv, processedBuffer);
      emitDebugStage(this.options.debug, "threshold", processedMat);

      try {
        const digitCells = segmentDigitCells(cv, processedMat);
        const digits: DecodedDigit[] = digitCells.map((cellBBox) => {
          const { segments, confidence } = readSegmentStates(processedBuffer, cellBBox);
          return decodeDigit(segments, cellBBox, confidence);
        });

        emitDebugStage(this.options.debug, "digitos_detectados", processedMat);

        const result = validateDecodedNumber(digits);
        if (result.value !== null && result.confidence > best.confidence) {
          best = result;
        }
        if (best.value !== null && best.confidence >= HIGH_CONFIDENCE) break;
      } finally {
        processedMat.delete();
      }
    }

    return best;
  }

  /** Fallback: OCR genérico (Tesseract) restrito à ROI já recortada — nunca à foto inteira. */
  private async recognizeWithFallback(roiMat: CvMat): Promise<OcrResult> {
    const buffer = matToPixelBuffer(roiMat);
    const roiBlob = await imageDataToBlob(buffer);
    const result = await this.fallback.recognize(roiBlob);
    return { ...result, engineVersion: ENGINE_VERSION_WITH_FALLBACK };
  }

  /** Libera os workers/recursos usados (Tesseract de fallback). Chamar ao sair da tela de captura. */
  async terminate(): Promise<void> {
    await this.fallback.terminate();
  }
}
