import { describe, expect, it } from "vitest";
import {
  toGrayscale,
  adjustContrast,
  threshold,
  denoise,
  sharpen,
  stretchContrast,
  flattenIllumination,
  invert,
  meanLuminance,
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

function horizontalTotalVariation(buffer: PixelBuffer): number {
  let total = 0;
  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width - 1; x += 1) {
      const a = buffer.data[(y * buffer.width + x) * 4];
      const b = buffer.data[(y * buffer.width + x + 1) * 4];
      total += Math.abs(b - a);
    }
  }
  return total;
}

function makeEdgeBuffer(width: number, height: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = x < width / 2 ? 80 : 180;
      const i = (y * width + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

describe("sharpen", () => {
  it("não altera a imagem quando amount é 0", () => {
    const buffer = makeEdgeBuffer(4, 4);
    const result = sharpen(buffer, 0);
    expect(Array.from(result.data)).toEqual(Array.from(buffer.data));
  });

  it("aumenta o contraste nas bordas (realça a transição)", () => {
    const buffer = makeEdgeBuffer(4, 4);
    const result = sharpen(buffer, 1);
    expect(horizontalTotalVariation(result)).toBeGreaterThan(horizontalTotalVariation(buffer));
  });

  it("mantém dimensões e o canal alpha", () => {
    const buffer = makeEdgeBuffer(4, 4);
    const result = sharpen(buffer, 1);
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.data[3]).toBe(255);
  });
});

describe("stretchContrast", () => {
  it("leva o tom mais escuro a 0 e o mais claro a 255", () => {
    const buffer = makeEdgeBuffer(4, 4);
    const result = stretchContrast(buffer);
    const values = new Set(Array.from(result.data).filter((_, i) => i % 4 === 0));
    expect(values).toEqual(new Set([0, 255]));
  });

  it("não altera uma imagem uniforme", () => {
    const buffer = makeSolidBuffer(4, 4, [120, 120, 120, 255]);
    expect(Array.from(stretchContrast(buffer).data)).toEqual(Array.from(buffer.data));
  });
});

describe("flattenIllumination", () => {
  it("iguala o fundo sob um gradiente de luz (reflexo de um lado do visor)", () => {
    const width = 40;
    const height = 20;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = 90 + Math.round((x / (width - 1)) * 150); // 90 (sombra) → 240 (reflexo)
        const i = (y * width + x) * 4;
        data.set([value, value, value, 255], i);
      }
    }
    const buffer: PixelBuffer = { width, height, data };
    const result = flattenIllumination(buffer, 3);
    const left = result.data[(10 * width + 10) * 4];
    const right = result.data[(10 * width + 30) * 4];
    expect(Math.abs(right - left)).toBeLessThan(20);
    expect(Math.abs(data[(10 * width + 30) * 4] - data[(10 * width + 10) * 4])).toBeGreaterThan(60);
  });

  it("mantém um traço escuro mais escuro que o fundo ao redor", () => {
    const buffer = makeSolidBuffer(21, 21, [220, 220, 220, 255]);
    const center = (10 * 21 + 10) * 4;
    buffer.data.set([40, 40, 40], center);
    const result = flattenIllumination(buffer, 5);
    expect(result.data[center]).toBeLessThan(result.data[0] / 2);
  });
});

describe("invert", () => {
  it("gera o negativo e preserva o alpha", () => {
    const result = invert(makeSolidBuffer(1, 1, [0, 100, 255, 200]));
    expect(Array.from(result.data)).toEqual([255, 155, 0, 200]);
  });
});

describe("meanLuminance", () => {
  it("retorna a luminância média", () => {
    expect(meanLuminance(makeSolidBuffer(2, 2, [100, 100, 100, 255]))).toBeCloseTo(100);
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
