import type { OcrProvider, OcrResult } from "@/features/ocr/types";
import { joinSplitDigitGroups, parseNumericCandidates, pickBestCandidate } from "@/features/ocr/parse-candidates";

const ENGINE_VERSION = "ppu-paddle-ocr@6.4.3+PP-OCRv6-tiny";

export type PaddleOcrProgress = {
  status: "loading model" | "recognizing";
};

/** Formato mínimo do bloco de texto devolvido por `PaddleOcrService.recognize` (opção `flatten: true`). */
type PaddleTextBlock = {
  text: string;
  box: { width: number; height: number };
  confidence: number;
};

/** Uma leitura numérica candidata dentro de um bloco de texto, com o tamanho do bloco para a heurística de "maior é o principal". */
type NumericBlockCandidate = {
  value: number;
  confidence: number;
  /** Altura do bloco — aproxima o tamanho da fonte, o melhor sinal de "número principal". */
  height: number;
  area: number;
  /** Outros números encontrados no mesmo bloco (ex.: "1:54 288" tem "1", "54" e "288"), descartados em favor de `value`. */
  otherValuesInBlock: number[];
};

/**
 * Extrai, de cada bloco de texto reconhecido, o número principal (mesma
 * heurística `pickBestCandidate` usada pelo Tesseract: mais dígitos
 * vence) junto do tamanho do bloco — usado depois para escolher entre
 * blocos o valor principal do visor (relógio, contador de memória e
 * "mg/dL" formam blocos bem menores que o número grande central).
 * Dígitos separados só por espaço ("1 03") são juntados antes, porque o
 * vão entre dígitos de 7 segmentos engana o OCR.
 * Função pura, testável sem carregar o motor de OCR.
 */
export function extractNumericBlocks(blocks: PaddleTextBlock[]): NumericBlockCandidate[] {
  const out: NumericBlockCandidate[] = [];
  for (const block of blocks) {
    const numbers = parseNumericCandidates(block.text);
    const value = joinSplitDigitGroups(block.text) ?? pickBestCandidate(numbers);
    if (value === null) continue;
    out.push({
      value,
      confidence: block.confidence,
      height: block.box.height,
      area: block.box.width * block.box.height,
      otherValuesInBlock: numbers.filter((n) => n !== value),
    });
  }
  return out;
}

/**
 * Escolhe o bloco cujo número é a leitura principal do visor: o mais
 * alto (maior fonte), com a área como desempate. Altura é melhor que
 * área porque o relógio ("12:45") é largo e, num recorte folgado, pode
 * ter mais área que o valor grande central, mas nunca é mais alto que
 * ele. Retorna `null` se nenhum bloco tiver um número válido.
 */
export function pickMainReading(
  blocks: NumericBlockCandidate[],
): { value: number; confidence: number; candidates: number[] } | null {
  if (blocks.length === 0) return null;

  const sorted = [...blocks].sort((a, b) => b.height - a.height || b.area - a.area);
  const best = sorted[0];
  const otherValues = sorted
    .slice(1)
    .map((b) => b.value)
    .concat(best.otherValuesInBlock);
  const candidates = Array.from(new Set(otherValues)).filter((v) => v !== best.value);

  return { value: best.value, confidence: best.confidence, candidates };
}

/**
 * Implementação de `OcrProvider` com PaddleOCR (via `ppu-paddle-ocr`,
 * ONNX Runtime Web + WASM), carregada sob demanda — o import só
 * acontece na primeira chamada de `recognize`.
 *
 * Ao contrário do leitor de 7 segmentos dedicado, este é um OCR de
 * texto genérico: detecta e reconhece TODOS os blocos de texto da
 * imagem (relógio, contador de memória, "mg/dL", o número principal)
 * e não só o número — por isso `pickMainReading` escolhe entre eles
 * pela área do bloco, em vez de precisar de uma etapa dedicada de
 * "achar o visor e recortar o número" como o leitor de 7 segmentos.
 *
 * Requer acesso à internet na primeira vez que roda neste dispositivo:
 * os pesos do modelo (~6 MB, PP-OCRv6 tiny) são baixados de um
 * repositório público no Hugging Face (não são enviados pelo
 * GlicoNexo) — documentado em `docs/architecture.md` e
 * `docs/privacy-and-security.md`, mesmo padrão já usado pelo
 * Tesseract.js.
 */
export class PaddleOcrProvider implements OcrProvider {
  private servicePromise: Promise<PaddleOcrServiceLike> | null = null;

  constructor(private onProgress?: (progress: PaddleOcrProgress) => void) {}

  private async getService(): Promise<PaddleOcrServiceLike> {
    if (!this.servicePromise) {
      this.servicePromise = (async () => {
        this.onProgress?.({ status: "loading model" });
        const { PaddleOcrService } = await import("ppu-paddle-ocr/web");
        const service = new PaddleOcrService();
        await service.initialize();
        return service;
      })();
    }
    return this.servicePromise;
  }

  async recognize(input: Blob): Promise<OcrResult> {
    const service = await this.getService();
    this.onProgress?.({ status: "recognizing" });

    const buffer = await input.arrayBuffer();
    const result = await service.recognize(buffer, { flatten: true });

    const blocks = extractNumericBlocks(result.results ?? []);
    const reading = pickMainReading(blocks);

    if (!reading) {
      return { value: null, confidence: 0, candidates: [], engineVersion: ENGINE_VERSION };
    }

    return {
      value: reading.value,
      confidence: Math.max(0, Math.min(1, reading.confidence)),
      candidates: reading.candidates,
      engineVersion: ENGINE_VERSION,
    };
  }

  /** Libera as sessões ONNX. Chamar ao sair da tela de captura. */
  async terminate(): Promise<void> {
    if (this.servicePromise) {
      const service = await this.servicePromise;
      await service.destroy();
      this.servicePromise = null;
    }
  }
}

/**
 * Formato estrutural mínimo de `PaddleOcrService` (de `ppu-paddle-ocr/web`)
 * realmente usado aqui — evita acoplar todo o módulo ao shape exato dos
 * tipos gerados pelo pacote, mesmo princípio já usado para `CvNamespace`
 * em `seven-segment/types.ts`.
 */
type PaddleOcrServiceLike = {
  initialize(): Promise<void>;
  recognize(
    image: ArrayBuffer,
    options: { flatten: true },
  ): Promise<{ results?: PaddleTextBlock[] }>;
  destroy(): Promise<void>;
};
