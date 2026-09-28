import { loadImageDataFromUrl, imageDataToBlob } from "@/features/ocr/canvas-utils";
import { preprocessForThreshold, THRESHOLD_LEVELS, type PixelBuffer } from "@/features/ocr/preprocess";
import type { OcrProvider, OcrResult } from "@/features/ocr/types";

/** Confiança a partir da qual paramos de testar outras variantes. Compartilhada por outros providers. */
export const HIGH_CONFIDENCE = 0.85;

const EMPTY_RESULT: OcrResult = { value: null, confidence: 0, candidates: [], engineVersion: "" };

export type PreprocessVariant = {
  name: string;
  apply: (buffer: PixelBuffer) => PixelBuffer;
  /** Se definido, a variante só roda quando retornar `true` para a imagem original (ex.: só em visores escuros). */
  when?: (buffer: PixelBuffer) => boolean;
};

type AttemptState = { best: OcrResult; attempted: OcrResult[] };

const INITIAL_STATE: AttemptState = { best: EMPTY_RESULT, attempted: [] };

/**
 * Quando mais de uma variante realmente rodou, um valor só é reportado
 * com a confiança original se pelo menos outra variante também tiver
 * chegado ao mesmo valor. Um resultado isolado (não corroborado) tem a
 * confiança limitada a pouco abaixo de `HIGH_CONFIDENCE`, para nunca
 * aparecer como "alta confiança" na tela de confirmação a partir de uma
 * única leitura possivelmente errada.
 */
function corroboratedConfidence(attempted: OcrResult[], winner: OcrResult): number {
  if (attempted.length < 2 || winner.value === null) return winner.confidence;
  const agreeing = attempted.filter((result) => result.value === winner.value).length;
  return agreeing >= 2 ? winner.confidence : Math.min(winner.confidence, HIGH_CONFIDENCE - 0.16);
}

/**
 * Aplica o resultado de mais uma tentativa ao estado acumulado e diz se
 * o laço deve parar (alta confiança já atingida). Função pura — não
 * depende de canvas/Image, então é testável isoladamente do
 * carregamento/decodificação de imagem real.
 */
export function foldAttempt(state: AttemptState, result: OcrResult): { state: AttemptState; stop: boolean } {
  const attempted = [...state.attempted, result];
  const best = result.confidence > state.best.confidence ? result : state.best;
  const stop = best.value !== null && best.confidence >= HIGH_CONFIDENCE;
  return { state: { best, attempted }, stop };
}

/**
 * Escolhe o valor final por votação ponderada: soma a confiança de cada
 * tentativa que chegou ao mesmo valor. Duas variantes concordando em 120
 * (0,5 + 0,5) vencem uma única leitura de 170 com 0,7 — concordância
 * entre pré-processamentos diferentes é um sinal mais confiável do que
 * a confiança isolada do motor. A confiança reportada é a maior entre as
 * tentativas do valor vencedor (nunca a soma), ainda sujeita ao
 * capeamento de corroboração. Os demais valores vistos viram candidatos.
 */
function voteOnAttempts(attempted: OcrResult[], fallback: OcrResult): OcrResult {
  const scores = new Map<number, { score: number; best: OcrResult }>();
  for (const result of attempted) {
    if (result.value === null) continue;
    const entry = scores.get(result.value);
    if (!entry) {
      scores.set(result.value, { score: result.confidence, best: result });
    } else {
      entry.score += result.confidence;
      if (result.confidence > entry.best.confidence) entry.best = result;
    }
  }
  if (scores.size === 0) return fallback;

  const chosen = Array.from(scores.values()).reduce((a, b) => (b.score > a.score ? b : a)).best;
  const others = attempted.flatMap((result) => [result.value, ...result.candidates]);
  const candidates = Array.from(new Set(others)).filter(
    (value): value is number => value !== null && value !== chosen.value,
  );
  return { ...chosen, candidates };
}

/** Resultado final a partir do estado acumulado, com votação e capeamento de corroboração já aplicados. */
export function finalizeAttempts(state: AttemptState): OcrResult {
  const winner = voteOnAttempts(state.attempted, state.best);
  return { ...winner, confidence: corroboratedConfidence(state.attempted, winner) };
}

/**
 * Versão pura/síncrona da mesma lógica de seleção usada por
 * `runOcrPipelineWithVariants`, útil para testar o comportamento de
 * "parar cedo" e "capear confiança não corroborada" sem precisar de um
 * `OcrProvider` real nem de decodificação de imagem: recebe a lista de
 * resultados como se cada variante já tivesse rodado, na ordem, e para
 * de "consumir" a lista assim que atingir `HIGH_CONFIDENCE`.
 */
export function resolveAttempts(results: OcrResult[]): { result: OcrResult; usedCount: number } {
  let state = INITIAL_STATE;
  let usedCount = 0;

  for (const result of results) {
    const folded = foldAttempt(state, result);
    state = folded.state;
    usedCount += 1;
    if (folded.stop) break;
  }

  return { result: finalizeAttempts(state), usedCount };
}

/**
 * Roda o OCR contra cada variante de pré-processamento em ordem,
 * ficando com o resultado de maior confiança e parando cedo ao atingir
 * `HIGH_CONFIDENCE` (CLAUDE.md 10.6: "testar variacoes ... e selecionar
 * o candidato mais consistente"). `onAttempt` é chamado antes de cada
 * tentativa, para a tela de captura mostrar o progresso.
 */
export async function runOcrPipelineWithVariants(
  croppedImageBlob: Blob,
  provider: OcrProvider,
  variants: PreprocessVariant[],
  onAttempt?: (attempt: number, total: number) => void,
): Promise<OcrResult> {
  const url = URL.createObjectURL(croppedImageBlob);
  try {
    const imageData = await loadImageDataFromUrl(url);
    const applicable = variants.filter((variant) => !variant.when || variant.when(imageData));
    let state = INITIAL_STATE;

    for (let index = 0; index < applicable.length; index += 1) {
      onAttempt?.(index + 1, applicable.length);
      const processed = applicable[index].apply(imageData);
      const processedBlob = await imageDataToBlob(processed);
      const result = await provider.recognize(processedBlob);
      const folded = foldAttempt(state, result);
      state = folded.state;
      if (folded.stop) break;
    }

    return finalizeAttempts(state);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Varredura dos níveis de limiar clássicos (binarização) — usada pelo
 * leitor de 7 segmentos. Wrapper fino sobre `runOcrPipelineWithVariants`
 * para manter a assinatura anterior.
 */
export async function runOcrPipeline(
  croppedImageBlob: Blob,
  provider: OcrProvider,
): Promise<OcrResult> {
  const variants: PreprocessVariant[] = THRESHOLD_LEVELS.map((level) => ({
    name: `threshold-${level}`,
    apply: (buffer: PixelBuffer) => preprocessForThreshold(buffer, level),
  }));
  return runOcrPipelineWithVariants(croppedImageBlob, provider, variants);
}
