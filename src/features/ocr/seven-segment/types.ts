/** Retângulo em coordenadas de pixel (espaço da imagem/ROI sendo processada). */
export type BBox = { x: number; y: number; width: number; height: number };

/**
 * Formato estrutural mínimo de um `cv.Mat` usado pelas funções desta
 * pasta — evita depender do shape exato dos tipos gerados pelo pacote
 * `@techstark/opencv-js` (que podem variar entre versões) em todo o
 * código, mantendo só o loader (`opencv-loader.ts`) acoplado ao tipo
 * real do pacote.
 */
export type CvMat = {
  rows: number;
  cols: number;
  data: Uint8Array;
  /** Preenchido só em Mats de inteiros 32-bit (ex.: saída de `approxPolyDP`). */
  data32S?: Int32Array;
  delete(): void;
  roi(rect: { x: number; y: number; width: number; height: number }): CvMat;
  clone(): CvMat;
};

export type CvMatVector = {
  size(): number;
  get(index: number): CvMat;
  delete(): void;
};

/**
 * Superfície mínima da API do OpenCV.js (`@techstark/opencv-js`)
 * realmente usada pelo leitor de 7 segmentos, tipada manualmente em vez
 * de `typeof import("@techstark/opencv-js")` — o próprio README do
 * pacote avisa que as declarações de tipo podem não acompanhar a versão
 * mais recente do OpenCV.js, então confiar nelas para toda a superfície
 * (construtores, constantes, funções) seria um risco real de checagem
 * de tipos incorreta silenciosa. Isolar aqui também deixa explícito,
 * num só lugar, exatamente quais funções do OpenCV este módulo usa.
 */
export type CvNamespace = {
  Mat: new (rows?: number, cols?: number, type?: number) => CvMat;
  MatVector: new () => CvMatVector;
  Size: new (width: number, height: number) => unknown;
  CV_8UC4: number;
  CV_32FC2: number;
  COLOR_RGBA2GRAY: number;
  RETR_EXTERNAL: number;
  RETR_LIST: number;
  CHAIN_APPROX_SIMPLE: number;
  THRESH_BINARY: number;
  THRESH_BINARY_INV: number;
  THRESH_OTSU: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  adaptiveThreshold(
    src: CvMat,
    dst: CvMat,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    c: number,
  ): void;
  matFromImageData(imageData: ImageData): CvMat;
  matFromArray(rows: number, cols: number, type: number, array: number[]): CvMat;
  cvtColor(src: CvMat, dst: CvMat, code: number): void;
  GaussianBlur(src: CvMat, dst: CvMat, ksize: unknown, sigmaX: number): void;
  Canny(src: CvMat, dst: CvMat, threshold1: number, threshold2: number): void;
  findContours(src: CvMat, contours: CvMatVector, hierarchy: CvMat, mode: number, method: number): void;
  contourArea(contour: CvMat): number;
  arcLength(curve: CvMat, closed: boolean): number;
  approxPolyDP(curve: CvMat, approxCurve: CvMat, epsilon: number, closed: boolean): void;
  boundingRect(contour: CvMat): { x: number; y: number; width: number; height: number };
  threshold(src: CvMat, dst: CvMat, thresh: number, maxval: number, type: number): number;
  getPerspectiveTransform(src: CvMat, dst: CvMat): CvMat;
  warpPerspective(src: CvMat, dst: CvMat, transform: CvMat, dsize: unknown): void;
  /**
   * Desenha o `Mat` num `<canvas>`. Usado como via de leitura de pixels
   * em vez de `mat.data` diretamente: builds do binding WASM (ver nota
   * em `matToPixelBuffer`) podem devolver metadados de `step`/
   * `isContinuous()` inconsistentes com o buffer real após
   * `roi().clone()`, então `imshow` (caminho de I/O oficial do
   * OpenCV.js, testado para lidar com stride corretamente) é mais
   * confiável do que reimplementar a leitura por conta própria.
   */
  imshow(canvas: HTMLCanvasElement, mat: CvMat): void;
  onRuntimeInitialized?: () => void;
};

export type Point = { x: number; y: number };

/** Quadrilátero do visor detectado na imagem, em ordem TL, TR, BR, BL. */
export type DisplayQuad = { corners: [Point, Point, Point, Point] };

/** Grupo de dígitos considerados parte da mesma leitura (mesma linha, tamanho similar). */
export type DigitCluster = { bbox: BBox; digitBoxes: BBox[] };

/**
 * Estado dos 7 segmentos de um dígito. Ordem fixa usada em toda a
 * decodificação: top, topLeft, topRight, middle, bottomLeft,
 * bottomRight, bottom.
 */
export type SegmentState = {
  top: boolean;
  topLeft: boolean;
  topRight: boolean;
  middle: boolean;
  bottomLeft: boolean;
  bottomRight: boolean;
  bottom: boolean;
};

export type DecodedDigit = {
  /** Dígito decodificado ("0"-"9"), ou `null` se o padrão for ambíguo/desconhecido — nunca um "chute". */
  char: string | null;
  segments: SegmentState;
  /** 0 a 1 — quão longe da fronteira de decisão ficou a amostragem de cada segmento. */
  confidence: number;
};

/** Nomes dos estágios intermediários, usados só para depuração em desenvolvimento. */
export type SevenSegmentDebugStage =
  | "original"
  | "display_detectado"
  | "perspectiva_corrigida"
  | "roi_numero"
  | "threshold"
  | "digitos_detectados";

export type SevenSegmentDebugHooks = {
  onStage: (stage: SevenSegmentDebugStage, dataUrl: string) => void;
};
