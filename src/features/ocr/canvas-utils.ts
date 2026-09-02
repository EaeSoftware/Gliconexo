/** Carrega uma imagem a partir de uma URL (inclusive `blob:`/`data:`). */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem."))),
      "image/jpeg",
      0.92,
    );
  });
}

/** Gira a imagem em `degrees` (múltiplo de 90) e devolve um novo blob JPEG. */
export async function rotateImageUrl(sourceUrl: string, degrees: 90 | -90): Promise<Blob> {
  const img = await loadImage(sourceUrl);
  const swapDimensions = Math.abs(degrees) % 180 === 90;
  const canvas = document.createElement("canvas");
  canvas.width = swapDimensions ? img.naturalHeight : img.naturalWidth;
  canvas.height = swapDimensions ? img.naturalWidth : img.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível.");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  return toBlob(canvas);
}

export type CropRectPercent = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Recorta a imagem segundo um retângulo em porcentagem (0-100) da imagem completa. */
export async function cropImageUrl(sourceUrl: string, rect: CropRectPercent): Promise<Blob> {
  const img = await loadImage(sourceUrl);
  const sx = (rect.x / 100) * img.naturalWidth;
  const sy = (rect.y / 100) * img.naturalHeight;
  const sw = (rect.width / 100) * img.naturalWidth;
  const sh = (rect.height / 100) * img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível.");
  context.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return toBlob(canvas);
}

/**
 * Extrai o `ImageData` (pixels) de uma imagem, para o pipeline de
 * pré-processamento. Recortes de visor costumam ser pequenos, então a
 * imagem é ampliada até `minDimension` (na menor dimensão) porque o OCR
 * de dígitos de 7 segmentos melhora muito com glifos maiores.
 */
export async function loadImageDataFromUrl(
  sourceUrl: string,
  minDimension = 400,
): Promise<ImageData> {
  const img = await loadImage(sourceUrl);
  const shorterSide = Math.min(img.naturalWidth, img.naturalHeight);
  const scale = shorterSide > 0 && shorterSide < minDimension ? minDimension / shorterSide : 1;
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(img, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

/** Converte um `ImageData` (ou compatível) de volta para um blob JPEG. */
export async function imageDataToBlob(imageData: {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível.");
  // Copia para um ArrayBuffer "puro": o construtor de ImageData não aceita
  // o tipo genérico de Uint8ClampedArray<ArrayBufferLike> usado no pipeline.
  const data = new Uint8ClampedArray(imageData.data);
  context.putImageData(new ImageData(data, imageData.width, imageData.height), 0, 0);
  return toBlob(canvas);
}
