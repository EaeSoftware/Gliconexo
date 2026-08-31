/**
 * Buffer de pixels no formato RGBA (o mesmo layout de `ImageData`, mas
 * como um tipo próprio para que estas funções sejam puras e testáveis
 * sem depender de `<canvas>`/`ImageData` real do navegador).
 */
export type PixelBuffer = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

function clonePixelBuffer(buffer: PixelBuffer): PixelBuffer {
  return { width: buffer.width, height: buffer.height, data: new Uint8ClampedArray(buffer.data) };
}

/** Converte para escala de cinza (luminância perceptual), mantendo o formato RGBA. */
export function toGrayscale(buffer: PixelBuffer): PixelBuffer {
  const result = clonePixelBuffer(buffer);
  for (let i = 0; i < result.data.length; i += 4) {
    const r = result.data[i];
    const g = result.data[i + 1];
    const b = result.data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    result.data[i] = gray;
    result.data[i + 1] = gray;
    result.data[i + 2] = gray;
  }
  return result;
}

/**
 * Aumenta o contraste em torno do ponto médio (128). `factor` maior
 * que 1 aumenta o contraste; 1 não altera a imagem.
 */
export function adjustContrast(buffer: PixelBuffer, factor: number): PixelBuffer {
  const result = clonePixelBuffer(buffer);
  for (let i = 0; i < result.data.length; i += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = result.data[i + channel];
      result.data[i + channel] = (value - 128) * factor + 128;
    }
  }
  return result;
}

/** Binariza: pixels com luminância >= `level` viram branco, o resto preto. */
export function threshold(buffer: PixelBuffer, level: number): PixelBuffer {
  const result = clonePixelBuffer(buffer);
  for (let i = 0; i < result.data.length; i += 4) {
    const value = result.data[i] >= level ? 255 : 0;
    result.data[i] = value;
    result.data[i + 1] = value;
    result.data[i + 2] = value;
  }
  return result;
}

/**
 * Redução simples de ruído: filtro de mediana 3x3 (bom para remover
 * pontos isolados sem borrar os traços dos dígitos).
 */
export function denoise(buffer: PixelBuffer): PixelBuffer {
  const { width, height, data } = buffer;
  const result = clonePixelBuffer(buffer);
  const window: number[] = new Array(9);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let count = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          window[count] = data[(ny * width + nx) * 4];
          count += 1;
        }
      }
      window.sort((a, b) => a - b);
      const median = window[4];
      const i = (y * width + x) * 4;
      result.data[i] = median;
      result.data[i + 1] = median;
      result.data[i + 2] = median;
    }
  }
  return result;
}

/** Níveis de limiar testados para escolher o candidato mais consistente (CLAUDE.md, seção 10.6). */
export const THRESHOLD_LEVELS = [100, 130, 160] as const;

/**
 * Aplica o pipeline completo (cinza -> contraste -> ruído -> limiar)
 * para um nível de limiar específico.
 */
export function preprocessForThreshold(buffer: PixelBuffer, level: number): PixelBuffer {
  const gray = toGrayscale(buffer);
  const contrasted = adjustContrast(gray, 1.4);
  const denoised = denoise(contrasted);
  return threshold(denoised, level);
}
