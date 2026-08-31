import { describe, expect, it } from "vitest";
import {
  toGrayscale,
  adjustContrast,
  threshold,
  denoise,
  preprocessForThreshold,
  type PixelBuffer,
} from "@/features/ocr/preprocess";

function makeSolidBuffer(width: number, height: number, [r, g, b, a]: number[]): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { width, height, data };
}

describe("toGrayscale", () => {
  it("iguala R, G e B pela luminância perceptual e preserva o alpha", () => {
    const buffer = makeSolidBuffer(1, 1, [255, 0, 0, 255]);
    const result = toGrayscale(buffer);
    expect(result.data[0]).toBe(result.data[1]);
    expect(result.data[1]).toBe(result.data[2]);
    expect(result.data[0]).toBe(Math.round(0.299 * 255));
    expect(result.data[3]).toBe(255);
  });

  it("não modifica o buffer original (função pura)", () => {
    const buffer = makeSolidBuffer(1, 1, [255, 0, 0, 255]);
    toGrayscale(buffer);
    expect(buffer.data[1]).toBe(0);
  });
});

describe("adjustContrast", () => {
  it("não altera a imagem quando factor é 1", () => {
    const buffer = makeSolidBuffer(1, 1, [180, 180, 180, 255]);
    const result = adjustContrast(buffer, 1);
    expect(result.data[0]).toBe(180);
  });

  it("afasta valores do ponto médio quando factor > 1", () => {
    const buffer = makeSolidBuffer(1, 1, [200, 200, 200, 255]);
    const result = adjustContrast(buffer, 2);
    expect(result.data[0]).toBe(255); // (200-128)*2+128 = 272, clamp 255
  });
});

describe("threshold", () => {
  it("converte para branco valores no limiar ou acima", () => {
    const buffer = makeSolidBuffer(1, 1, [130, 130, 130, 255]);
    const result = threshold(buffer, 130);
    expect(result.data[0]).toBe(255);
  });

  it("converte para preto valores abaixo do limiar", () => {
    const buffer = makeSolidBuffer(1, 1, [100, 100, 100, 255]);
    const result = threshold(buffer, 130);
    expect(result.data[0]).toBe(0);
  });
});

describe("denoise", () => {
  it("remove um pixel isolado de ruído (mediana 3x3)", () => {
    // Fundo branco 3x3 com um único pixel preto de ruído no centro.
    const buffer = makeSolidBuffer(3, 3, [255, 255, 255, 255]);
    const centerIndex = (1 * 3 + 1) * 4;
    buffer.data[centerIndex] = 0;
    buffer.data[centerIndex + 1] = 0;
    buffer.data[centerIndex + 2] = 0;

    const result = denoise(buffer);

    expect(result.data[centerIndex]).toBe(255);
  });

  it("mantém as dimensões do buffer", () => {
    const buffer = makeSolidBuffer(5, 4, [100, 100, 100, 255]);
    const result = denoise(buffer);
    expect(result.width).toBe(5);
    expect(result.height).toBe(4);
    expect(result.data.length).toBe(buffer.data.length);
  });
});

describe("preprocessForThreshold", () => {
  it("produz um buffer binário (apenas 0 ou 255) do mesmo tamanho", () => {
    const buffer = makeSolidBuffer(4, 4, [90, 140, 200, 255]);
    const result = preprocessForThreshold(buffer, 130);

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    for (let i = 0; i < result.data.length; i += 4) {
      expect([0, 255]).toContain(result.data[i]);
    }
  });
});
