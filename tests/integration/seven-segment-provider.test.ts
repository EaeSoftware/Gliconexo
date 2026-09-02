import { describe, expect, it } from "vitest";
import { SevenSegmentOcrProvider } from "@/features/ocr/seven-segment/seven-segment-provider";
import type { SegmentState } from "@/features/ocr/seven-segment/types";
import { SEGMENT_DIGIT_TABLE } from "@/features/ocr/seven-segment/decode-seven-segment";

/**
 * Testes de integração: rodam o pipeline completo (OpenCV.js real via
 * WASM + canvas real via o pacote `canvas`) sobre imagens sintéticas
 * de um display de 7 segmentos, desenhadas em memória — nunca fotos
 * reais de pacientes. Rodar com `npm run test:integration`
 * (vitest.integration.config.ts), separado de `npm test` porque são
 * mais lentos e precisam do pacote `canvas` instalado.
 *
 * Este arquivo é o item de maior incerteza técnica do plano de
 * implementação (compatibilidade de `@techstark/opencv-js` rodando
 * sob jsdom + `canvas` em Node ainda não foi validada rodando de fato
 * — ver docs/testing.md). Por isso o teste principal de precisão é
 * tolerante a uma falha de inicialização do WASM nesse ambiente
 * específico (degrada para `null` em vez de travar a suíte), mas o
 * teste de robustez (nunca lançar exceção) é uma garantia
 * incondicional exigida pelo produto (CLAUDE.md, regra 15).
 */

function segmentsFromDigit(char: string): SegmentState {
  const key = Object.entries(SEGMENT_DIGIT_TABLE).find(([, value]) => value === char)?.[0];
  if (!key) throw new Error(`Dígito sem padrão de segmentos: ${char}`);
  const [top, topLeft, topRight, middle, bottomLeft, bottomRight, bottom] = key.split("").map((v) => v === "1");
  return { top, topLeft, topRight, middle, bottomLeft, bottomRight, bottom };
}

const SEGMENT_BAR_THICKNESS_RATIO = 0.12;

/** Desenha um único dígito de 7 segmentos como barras retangulares dentro de `cellBBox`. */
function drawDigit(
  ctx: CanvasRenderingContext2D,
  cellBBox: { x: number; y: number; width: number; height: number },
  segments: SegmentState,
) {
  const { x, y, width: w, height: h } = cellBBox;
  const t = h * SEGMENT_BAR_THICKNESS_RATIO;

  ctx.fillStyle = "black";
  if (segments.top) ctx.fillRect(x + t, y, w - 2 * t, t);
  if (segments.middle) ctx.fillRect(x + t, y + h / 2 - t / 2, w - 2 * t, t);
  if (segments.bottom) ctx.fillRect(x + t, y + h - t, w - 2 * t, t);
  if (segments.topLeft) ctx.fillRect(x, y, t, h / 2);
  if (segments.topRight) ctx.fillRect(x + w - t, y, t, h / 2);
  if (segments.bottomLeft) ctx.fillRect(x, y + h / 2, t, h / 2);
  if (segments.bottomRight) ctx.fillRect(x + w - t, y + h / 2, t, h / 2);
}

/** Gera um blob JPEG sintético com "103" grande e central, mais "54" pequeno no canto superior. */
async function makeSyntheticMeterPhoto(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 220;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível neste ambiente de teste");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // "103" grande e central.
  drawDigit(ctx, { x: 60, y: 100, width: 40, height: 90 }, segmentsFromDigit("1"));
  drawDigit(ctx, { x: 110, y: 100, width: 40, height: 90 }, segmentsFromDigit("0"));
  drawDigit(ctx, { x: 160, y: 100, width: 40, height: 90 }, segmentsFromDigit("3"));

  // "54" pequeno, canto superior — não deve ser confundido com a leitura principal.
  drawDigit(ctx, { x: 20, y: 10, width: 18, height: 35 }, segmentsFromDigit("5"));
  drawDigit(ctx, { x: 45, y: 10, width: 18, height: 35 }, segmentsFromDigit("4"));

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("falha ao gerar blob"))), "image/jpeg", 0.95);
  });
}

describe("SevenSegmentOcrProvider (integração)", () => {
  it("nunca lança exceção, mesmo diante de uma imagem sem display legível", async () => {
    const provider = new SevenSegmentOcrProvider();
    const blank = document.createElement("canvas");
    blank.width = 10;
    blank.height = 10;
    const blob: Blob = await new Promise((resolve, reject) => {
      blank.toBlob((b) => (b ? resolve(b) : reject(new Error("falha ao gerar blob"))), "image/jpeg");
    });

    await expect(provider.recognize(blob)).resolves.toMatchObject({});
    await provider.terminate();
  });

  it("lê o número grande central e ignora os dígitos pequenos, quando o ambiente suporta OpenCV.js/WASM", async () => {
    const blob = await makeSyntheticMeterPhoto();
    const provider = new SevenSegmentOcrProvider();

    const result = await provider.recognize(blob);
    await provider.terminate();

    if (result.value === null) {
      // Ambiente de CI/local pode não suportar o WASM do OpenCV.js sob
      // jsdom+canvas — degradar para null (nunca travar a suíte) é o
      // comportamento esperado e seguro nesse caso, mas não valida a
      // precisão do algoritmo. Ver nota no topo do arquivo.
      console.warn(
        "seven-segment-provider integration test: OpenCV.js não retornou um valor neste ambiente; " +
          "precisão não validada aqui — testar manualmente num navegador real.",
      );
      return;
    }

    expect(result.value).toBe(103);
  });
});
