/**
 * Buffer de pixels no formato RGBA (o mesmo layout de `ImageData`, mas
 * como um tipo próprio para que estas funções sejam puras e testáveis
 * sem depender de `<canvas>`/`ImageData` real do navegador).
 */
export type PixelBuffer = {
  width: number;
  height: number;
  data: Uint8ClampedArray<ArrayBuffer>;
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

/**
 * Máscara de nitidez (unsharp mask) 3x3: realça bordas para compensar
 * desfoque leve de foco ou mão trêmula antes do OCR. `amount=0` não
 * altera a imagem; a saída é automaticamente recortada para 0-255 pelo
 * próprio `Uint8ClampedArray`.
 */
export function sharpen(buffer: PixelBuffer, amount = 1): PixelBuffer {
  const { width, height, data } = buffer;
  const result = clonePixelBuffer(buffer);
  const center = 1 + 4 * amount;
  const side = -amount;

  const at = (x: number, y: number, channel: number): number => {
    const cx = Math.min(width - 1, Math.max(0, x));
    const cy = Math.min(height - 1, Math.max(0, y));
    return data[(cy * width + cx) * 4 + channel];
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let channel = 0; channel < 3; channel += 1) {
        const value =
          center * at(x, y, channel) +
          side * (at(x - 1, y, channel) + at(x + 1, y, channel) + at(x, y - 1, channel) + at(x, y + 1, channel));
        result.data[(y * width + x) * 4 + channel] = value;
      }
    }
  }
  return result;
}

function luminanceAt(data: Uint8ClampedArray, i: number): number {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

/** Luminância média (0-255) da imagem inteira. */
export function meanLuminance(buffer: PixelBuffer): number {
  const pixels = buffer.width * buffer.height;
  if (pixels === 0) return 0;
  let total = 0;
  for (let i = 0; i < buffer.data.length; i += 4) total += luminanceAt(buffer.data, i);
  return total / pixels;
}

/**
 * Estica o histograma (auto-níveis): o percentil `lowPercentile` vira
 * preto e o `100 - lowPercentile` vira branco. Diferente de
 * `adjustContrast` (fator fixo em torno de 128), se adapta a fotos
 * escuras ou lavadas. Ignora os extremos para que um único pixel de
 * reflexo não "trave" o branco. Imagem quase uniforme volta inalterada.
 */
export function stretchContrast(buffer: PixelBuffer, lowPercentile = 1): PixelBuffer {
  const pixels = buffer.width * buffer.height;
  const result = clonePixelBuffer(buffer);
  if (pixels === 0) return result;

  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < buffer.data.length; i += 4) histogram[Math.round(luminanceAt(buffer.data, i))] += 1;

  const cut = (pixels * lowPercentile) / 100;
  let low = 0;
  for (let sum = 0; low < 255 && sum + histogram[low] <= cut; low += 1) sum += histogram[low];
  let high = 255;
  for (let sum = 0; high > 0 && sum + histogram[high] <= cut; high -= 1) sum += histogram[high];
  if (high - low < 10) return result;

  const scale = 255 / (high - low);
  for (let i = 0; i < result.data.length; i += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      result.data[i + channel] = (buffer.data[i + channel] - low) * scale;
    }
  }
  return result;
}

/**
 * Nivela iluminação irregular (reflexo, sombra do celular, gradiente de
 * luz): divide cada pixel pela média local numa janela grande (box blur
 * via imagem integral, O(n)). O fundo do visor tende a um cinza claro
 * uniforme e os traços dos dígitos continuam escuros, mesmo sob um
 * reflexo que clareia só parte do visor. `radius` precisa ser maior que
 * a espessura dos traços; por padrão, 1/6 do lado menor da imagem.
 * Trabalha sobre a luminância e devolve uma imagem em tons de cinza.
 */
export function flattenIllumination(buffer: PixelBuffer, radius?: number): PixelBuffer {
  const { width, height, data } = buffer;
  const result = clonePixelBuffer(buffer);
  if (width === 0 || height === 0) return result;
  const r = radius ?? Math.max(8, Math.round(Math.min(width, height) / 6));

  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < width; x += 1) {
      rowSum += luminanceAt(data, (y * width + x) * 4);
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowSum;
    }
  }

  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height, y + r + 1);
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width, x + r + 1);
      const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0];
      const localMean = sum / ((y1 - y0) * (x1 - x0));
      const i = (y * width + x) * 4;
      const value = (luminanceAt(data, i) / Math.max(1, localMean)) * 200;
      result.data[i] = value;
      result.data[i + 1] = value;
      result.data[i + 2] = value;
    }
  }
  return result;
}

/** Inverte as cores (negativo), mantendo o alpha. */
export function invert(buffer: PixelBuffer): PixelBuffer {
  const result = clonePixelBuffer(buffer);
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = 255 - result.data[i];
    result.data[i + 1] = 255 - result.data[i + 1];
    result.data[i + 2] = 255 - result.data[i + 2];
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
