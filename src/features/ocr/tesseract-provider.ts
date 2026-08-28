import type { Worker as TesseractWorker } from "tesseract.js";
import type { OcrProvider, OcrResult } from "@/features/ocr/types";
import { parseNumericCandidates, pickBestCandidate } from "@/features/ocr/parse-candidates";

const ENGINE_VERSION = "tesseract.js@7.0.0";

export type OcrProgress = {
  status: string;
  progress: number;
};

/**
 * Implementação de `OcrProvider` com Tesseract.js, carregada sob
 * demanda (o import só acontece na primeira chamada de `recognize`).
 *
 * Requer acesso à internet na primeira vez que roda neste dispositivo:
 * o motor (WebAssembly) e o modelo de idioma são baixados do CDN
 * público do próprio Tesseract.js (não são enviados pelo GlicoNexo).
 * Documentado em `docs/architecture.md` e `docs/privacy-and-security.md`.
 */
export class TesseractOcrProvider implements OcrProvider {
  private workerPromise: Promise<TesseractWorker> | null = null;

  constructor(private onProgress?: (progress: OcrProgress) => void) {}

  private async getWorker(): Promise<TesseractWorker> {
    if (!this.workerPromise) {
      this.workerPromise = (async () => {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng", undefined, {
          logger: (message) => this.onProgress?.({ status: message.status, progress: message.progress }),
        });
        // Restringe o reconhecimento a dígitos, conforme CLAUDE.md 10.6.
        await worker.setParameters({ tessedit_char_whitelist: "0123456789" });
        return worker;
      })();
    }
    return this.workerPromise;
  }

  async recognize(input: Blob): Promise<OcrResult> {
    const worker = await this.getWorker();
    const { data } = await worker.recognize(input);
    const candidates = parseNumericCandidates(data.text);

    return {
      value: pickBestCandidate(candidates),
      confidence: Math.max(0, Math.min(1, data.confidence / 100)),
      candidates,
      engineVersion: ENGINE_VERSION,
    };
  }

  /** Libera o worker. Chamar ao sair da tela de captura. */
  async terminate(): Promise<void> {
    if (this.workerPromise) {
      const worker = await this.workerPromise;
      await worker.terminate();
      this.workerPromise = null;
    }
  }
}
