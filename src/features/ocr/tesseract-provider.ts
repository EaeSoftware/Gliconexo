import { PSM, type Worker as TesseractWorker } from "tesseract.js";
import type { OcrProvider, OcrResult } from "@/features/ocr/types";
import { parseNumericCandidates } from "@/features/ocr/parse-candidates";

const ENGINE_VERSION = "tesseract.js@7.0.0";

export type OcrProgress = {
  status: string;
  progress: number;
};

/** Uma palavra reconhecida com sua caixa delimitadora, para heurística de tamanho. */
type RecognizedWord = {
  text: string;
  confidence: number;
  /** Altura do glifo em pixels — usada para achar o número principal (o maior). */
  glyphHeight: number;
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
        const { createWorker, PSM } = await import("tesseract.js");
        const worker = await createWorker("eng", undefined, {
          logger: (message) => this.onProgress?.({ status: message.status, progress: message.progress }),
        });
        await worker.setParameters({
          // Restringe o reconhecimento a dígitos, conforme CLAUDE.md 10.6.
          tessedit_char_whitelist: "0123456789",
          // Este provider agora só roda como fallback do leitor de 7
          // segmentos (ver seven-segment/ocr-fallback.ts), sempre sobre a
          // ROI já recortada e isolada do número grande — não mais sobre o
          // recorte inteiro do usuário, que podia ter várias linhas
          // (horário, contador de memória). Nesse contexto, tratar como
          // uma única linha evita que a segmentação automática (padrão,
          // pensada para páginas de texto comuns) quebre os dígitos do
          // mostrador em blocos separados e devolva um número diferente
          // do exibido.
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
        });
        return worker;
      })();
    }
    return this.workerPromise;
  }

  async recognize(input: Blob): Promise<OcrResult> {
    const worker = await this.getWorker();
    const { data } = await worker.recognize(input, {}, { blocks: true, text: true });

    const words = extractNumericWords(data.blocks);

    if (words.length > 0) {
      // O valor principal do visor é sempre o de maior altura de glifo
      // (ex.: "155" domina "6:41", "288" e "memory"). Ordena por altura
      // decrescente e usa o primeiro como valor escolhido.
      words.sort((a, b) => b.glyphHeight - a.glyphHeight);
      const ordered = uniqueValues(words.map((word) => Number(word.text)));
      const best = words[0];
      return {
        value: ordered[0] ?? null,
        confidence: Math.max(0, Math.min(1, best.confidence / 100)),
        candidates: ordered.slice(1),
        engineVersion: ENGINE_VERSION,
      };
    }

    // Fallback: sem caixas de palavra (algumas builds), usa o texto bruto.
    const candidates = parseNumericCandidates(data.text);
    return {
      value: candidates[0] ?? null,
      confidence: Math.max(0, Math.min(1, data.confidence / 100)),
      candidates: candidates.slice(1),
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

/**
 * Percorre a árvore de blocos do Tesseract (blocos → parágrafos → linhas
 * → palavras) e devolve as palavras que são números válidos (1–999),
 * com a altura do glifo para a heurística de "maior número é o
 * principal". A árvore é tipada de forma defensiva porque o formato pode
 * variar entre builds do tesseract.js.
 */
function extractNumericWords(blocks: unknown): RecognizedWord[] {
  const words: RecognizedWord[] = [];

  for (const block of childArray(blocks, "self")) {
    for (const paragraph of childArray(block, "paragraphs")) {
      for (const line of childArray(paragraph, "lines")) {
        for (const word of childArray(line, "words")) {
          const parsed = parseWord(word);
          if (parsed) words.push(parsed);
        }
      }
    }
  }
  return words;
}

/** Devolve `node[key]` como array de `unknown`, ou o próprio nó se `key === "self"`. */
function childArray(node: unknown, key: "self" | "paragraphs" | "lines" | "words"): unknown[] {
  const value = key === "self" ? node : isRecord(node) ? node[key] : undefined;
  return Array.isArray(value) ? value : [];
}

function parseWord(word: unknown): RecognizedWord | null {
  if (!isRecord(word)) return null;
  const text = String(word.text ?? "").replace(/\D/g, "");
  if (text.length === 0) return null;
  const value = Number(text);
  if (!Number.isInteger(value) || value < 1 || value > 999) return null;

  return {
    text,
    confidence: typeof word.confidence === "number" ? word.confidence : 0,
    glyphHeight: glyphHeightOf(word.bbox),
  };
}

/** Altura da caixa delimitadora (`{ y0, y1 }`) em pixels, ou 0 se ausente. */
function glyphHeightOf(bbox: unknown): number {
  if (!isRecord(bbox)) return 0;
  const y0 = bbox.y0;
  const y1 = bbox.y1;
  return typeof y0 === "number" && typeof y1 === "number" ? Math.abs(y1 - y0) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function uniqueValues(values: number[]): number[] {
  return Array.from(new Set(values));
}
