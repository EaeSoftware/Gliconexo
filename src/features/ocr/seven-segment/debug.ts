import type {
  CvMat,
  CvNamespace,
  SevenSegmentDebugHooks,
  SevenSegmentDebugStage,
} from "@/features/ocr/seven-segment/types";
import { matToPixelBuffer } from "@/features/ocr/seven-segment/preprocess-display";

/**
 * Emite uma imagem intermediária para calibração — só existe em
 * desenvolvimento. A comparação `process.env.NODE_ENV === "development"`
 * usa um literal que o Next.js/webpack substitui em tempo de build, o
 * que permite ao minificador eliminar todo este branch (e o custo de
 * codificar a imagem) do bundle de produção — não é apenas um `if`
 * verificado em runtime. Nunca grava em IndexedDB, `localStorage` nem
 * rede: só `console.debug` com uma `data:` URL, que o DevTools já
 * renderiza como imagem inspecionável.
 */
export function emitDebugStage(
  cv: CvNamespace,
  hooks: SevenSegmentDebugHooks | undefined,
  stage: SevenSegmentDebugStage,
  mat: CvMat,
): void {
  if (process.env.NODE_ENV !== "development") return;
  if (!hooks) return;

  const buffer = matToPixelBuffer(cv, mat);
  const canvas = document.createElement("canvas");
  canvas.width = buffer.width;
  canvas.height = buffer.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.putImageData(new ImageData(buffer.data, buffer.width, buffer.height), 0, 0);
  hooks.onStage(stage, canvas.toDataURL("image/jpeg", 0.7));
}
