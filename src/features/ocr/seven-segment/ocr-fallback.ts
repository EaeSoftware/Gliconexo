import type { PSM } from "tesseract.js";
import { TesseractOcrProvider, type OcrProgress } from "@/features/ocr/tesseract-provider";
import type { OcrResult } from "@/features/ocr/types";

/**
 * Fallback de OCR genérico para quando a decodificação de 7 segmentos
 * falha em todos os níveis de limiar. Reaproveita o `TesseractOcrProvider`
 * já existente. Aceita um modo de segmentação de página por chamada:
 * `SINGLE_LINE` quando o chamador já isolou o número grande numa ROI
 * (o caso comum), ou `SPARSE_TEXT` quando cai de volta no recorte
 * inteiro do usuário — que tem várias linhas de texto (horário,
 * contador de memória, `mg/dL`) além do número principal.
 */
export function createOcrFallback(onProgress?: (progress: OcrProgress) => void): {
  recognize: (roiBlob: Blob, psm?: PSM) => Promise<OcrResult>;
  terminate: () => Promise<void>;
} {
  const provider = new TesseractOcrProvider(onProgress);
  return {
    recognize: async (roiBlob: Blob, psm?: PSM) => {
      if (psm === undefined) return provider.recognize(roiBlob);
      return provider.recognizeWithMode(roiBlob, psm);
    },
    terminate: () => provider.terminate(),
  };
}
