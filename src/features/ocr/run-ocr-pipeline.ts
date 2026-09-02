import { loadImageDataFromUrl, imageDataToBlob } from "@/features/ocr/canvas-utils";
import { preprocessForThreshold, THRESHOLD_LEVELS } from "@/features/ocr/preprocess";
import type { OcrProvider, OcrResult } from "@/features/ocr/types";

/** Confiança a partir da qual paramos de testar outros níveis de limiar. Compartilhada por outros providers. */
export const HIGH_CONFIDENCE = 0.85;

const EMPTY_RESULT: OcrResult = { value: null, confidence: 0, candidates: [], engineVersion: "" };

/**
 * Roda o pipeline de pré-processamento + OCR: testa alguns níveis de
 * limiar (CLAUDE.md 10.6, "testar variacoes de limiar") e fica com o
 * resultado de maior confiança, parando cedo se já achar um candidato
 * de alta confiança.
 */
export async function runOcrPipeline(
  croppedImageBlob: Blob,
  provider: OcrProvider,
): Promise<OcrResult> {
  const url = URL.createObjectURL(croppedImageBlob);
  try {
    const imageData = await loadImageDataFromUrl(url);
    let best: OcrResult = EMPTY_RESULT;

    for (const level of THRESHOLD_LEVELS) {
      const processed = preprocessForThreshold(imageData, level);
      const processedBlob = await imageDataToBlob(processed);
      const result = await provider.recognize(processedBlob);

      if (result.confidence > best.confidence) {
        best = result;
      }
      if (best.value !== null && best.confidence >= HIGH_CONFIDENCE) break;
    }

    return best;
  } finally {
    URL.revokeObjectURL(url);
  }
}
