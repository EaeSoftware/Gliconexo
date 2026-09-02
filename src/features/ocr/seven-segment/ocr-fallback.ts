import { TesseractOcrProvider, type OcrProgress } from "@/features/ocr/tesseract-provider";
import type { OcrResult } from "@/features/ocr/types";

/**
 * Fallback de OCR genérico para quando a decodificação de 7 segmentos
 * falha em todos os níveis de limiar. Reaproveita o `TesseractOcrProvider`
 * já existente sem modificá-lo — a única diferença é que só é chamado
 * com a ROI já recortada pelo `crop_main_reading` (o número grande),
 * nunca com a foto inteira ou o recorte manual completo.
 */
export function createOcrFallback(onProgress?: (progress: OcrProgress) => void): {
  recognize: (roiBlob: Blob) => Promise<OcrResult>;
  terminate: () => Promise<void>;
} {
  const provider = new TesseractOcrProvider(onProgress);
  return {
    recognize: (roiBlob: Blob) => provider.recognize(roiBlob),
    terminate: () => provider.terminate(),
  };
}
