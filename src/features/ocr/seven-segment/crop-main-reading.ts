import type { CvNamespace } from "@/features/ocr/seven-segment/opencv-loader";
import type { BBox, CvMat, DigitCluster } from "@/features/ocr/seven-segment/types";

/** Menor ímpar >= `value`, com piso em `min` (exigido por `cv.adaptiveThreshold`). */
function oddAtLeast(value: number, min: number): number {
  const v = Math.max(value, min);
  return v % 2 === 0 ? v + 1 : v;
}

/** Contornos mais baixos que isto (relativo à altura da ROI) são descartados como ruído/pontos/ícones. */
export const MIN_GLYPH_HEIGHT_RATIO = 0.15;

/**
 * Contornos mais altos que isto (relativo à altura da ROI) são
 * descartados como moldura/borda do visor, não dígito: um contorno de
 * altura quase igual à da ROI inteira normalmente é o contraste entre
 * a área acesa do LCD e a moldura ao redor, não um glifo — sem este
 * filtro ele vence o `areaScore` de qualquer cluster de dígitos real.
 */
export const MAX_GLYPH_HEIGHT_RATIO = 0.85;

/** Tolerância de diferença de centro vertical (relativa à altura do glifo) para agrupar na mesma linha. */
export const ROW_Y_TOLERANCE_RATIO = 0.5;

/** Tolerância de diferença de altura (relativa à altura do glifo) para agrupar na mesma linha. */
export const ROW_HEIGHT_TOLERANCE_RATIO = 0.4;

/** Leituras válidas têm no máximo 3 dígitos (faixa 1-999) — mais que isso penaliza fortemente o cluster. */
export const MAX_READING_DIGITS = 3;

export const AREA_SCORE_WEIGHT = 0.6;
export const CENTER_SCORE_WEIGHT = 0.25;
export const DIGIT_COUNT_PENALTY_FACTOR = 0.3;

/** Pontuação mínima para um cluster ser considerado válido — abaixo disso, `null`. */
export const CLUSTER_SCORE_FLOOR = 0.05;

function bboxArea(box: BBox): number {
  return box.width * box.height;
}

function bboxCenter(box: BBox): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function unionBBox(boxes: BBox[]): BBox {
  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const maxY = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Agrupa bounding boxes de contornos em "linhas" de dígitos: caixas
 * com centro vertical e altura similares entram no mesmo cluster.
 * Isso separa o número grande central de números pequenos (horário,
 * contador de memória) mesmo quando aparecem próximos horizontalmente,
 * porque a altura do glifo também precisa ser compatível.
 */
export function clusterContoursByRow(boxes: BBox[], containerHeight: number): DigitCluster[] {
  const minHeight = MIN_GLYPH_HEIGHT_RATIO * containerHeight;
  const maxHeight = MAX_GLYPH_HEIGHT_RATIO * containerHeight;
  const filtered = boxes.filter((box) => box.height >= minHeight && box.height <= maxHeight);
  if (filtered.length === 0) return [];

  const sorted = [...filtered].sort((a, b) => bboxCenter(a).y - bboxCenter(b).y);

  const clusters: BBox[][] = [];
  for (const box of sorted) {
    const boxYCenter = bboxCenter(box).y;
    const target = clusters.find((cluster) => {
      const last = cluster[cluster.length - 1];
      const lastYCenter = bboxCenter(last).y;
      const minPairHeight = Math.min(last.height, box.height);
      const yDiff = Math.abs(boxYCenter - lastYCenter);
      const heightDiff = Math.abs(last.height - box.height);
      return yDiff < ROW_Y_TOLERANCE_RATIO * minPairHeight && heightDiff < ROW_HEIGHT_TOLERANCE_RATIO * minPairHeight;
    });
    if (target) {
      target.push(box);
    } else {
      clusters.push([box]);
    }
  }

  return clusters.map((members) => ({
    bbox: unionBBox(members),
    digitBoxes: [...members].sort((a, b) => a.x - b.x),
  }));
}

/**
 * Pontua um cluster pela probabilidade de ser a leitura principal:
 * maior área relativa à ROI e mais próximo do centro pontuam melhor;
 * mais de `MAX_READING_DIGITS` dígitos penaliza fortemente (leituras
 * válidas são 1-999).
 */
export function scoreCluster(cluster: DigitCluster, containerBBox: BBox): number {
  const containerArea = bboxArea(containerBBox);
  if (containerArea === 0) return 0;

  const areaScore = bboxArea(cluster.bbox) / containerArea;

  const clusterCenter = bboxCenter(cluster.bbox);
  const containerCenter = bboxCenter(containerBBox);
  const diagonal = Math.hypot(containerBBox.width, containerBBox.height);
  const distance = Math.hypot(clusterCenter.x - containerCenter.x, clusterCenter.y - containerCenter.y);
  const centerScore = diagonal > 0 ? 1 - distance / diagonal : 0;

  const digitCountPenalty = cluster.digitBoxes.length > MAX_READING_DIGITS ? DIGIT_COUNT_PENALTY_FACTOR : 1;

  return (areaScore * AREA_SCORE_WEIGHT + centerScore * CENTER_SCORE_WEIGHT) * digitCountPenalty;
}

/**
 * Escolhe o melhor cluster entre os candidatos, ou `null` se nenhum
 * for confiável o bastante (pontuação abaixo do piso, ou contagem de
 * dígitos inválida — 0 ou mais que `MAX_READING_DIGITS`).
 */
export function pickBestCluster(clusters: DigitCluster[], containerBBox: BBox): DigitCluster | null {
  let best: DigitCluster | null = null;
  let bestScore = -Infinity;

  for (const cluster of clusters) {
    if (cluster.digitBoxes.length === 0 || cluster.digitBoxes.length > MAX_READING_DIGITS) continue;
    const score = scoreCluster(cluster, containerBBox);
    if (score > bestScore) {
      bestScore = score;
      best = cluster;
    }
  }

  return best !== null && bestScore >= CLUSTER_SCORE_FLOOR ? best : null;
}

/** Margem adicionada ao redor do cluster escolhido ao recortar, para não cortar bordas de segmentos. */
export const CLUSTER_CROP_PADDING_RATIO = 0.08;

/** Recorta o `cv.Mat` para o bbox do cluster, com uma margem de segurança, sem sair dos limites da imagem. */
export function cropMatToBBox(mat: CvMat, bbox: BBox): CvMat {
  const paddingX = bbox.width * CLUSTER_CROP_PADDING_RATIO;
  const paddingY = bbox.height * CLUSTER_CROP_PADDING_RATIO;

  const x = Math.max(0, Math.round(bbox.x - paddingX));
  const y = Math.max(0, Math.round(bbox.y - paddingY));
  const width = Math.min(mat.cols - x, Math.round(bbox.width + paddingX * 2));
  const height = Math.min(mat.rows - y, Math.round(bbox.height + paddingY * 2));

  // .clone() torna a região contígua na memória: um `.roi()` sozinho é
  // apenas uma view sobre o Mat original (mesmo buffer, com `step`
  // diferente de `cols`), o que quebra qualquer leitura de pixel que
  // assuma dados contíguos (como `matToPixelBuffer`).
  const view = mat.roi({ x, y, width, height });
  try {
    return view.clone();
  } finally {
    view.delete();
  }
}

/**
 * Encontra o cluster do número principal dentro do `cv.Mat` do visor
 * (já com perspectiva corrigida, se aplicável). Binariza por Otsu,
 * extrai contornos e delega a escolha do cluster às funções puras
 * acima. Retorna `null` (nunca lança) se nada plausível for
 * encontrado — o chamador deve então cair no fallback de OCR.
 */
export function findMainReadingCluster(cv: CvNamespace, mat: CvMat): DigitCluster | null {
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const thresholded = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    // Borrão antes do limiar adaptativo: sem isso, textura fina (grão
    // do plástico do aparelho, ruído JPEG, poeira) sobrevive ao corte
    // local e gera dezenas de micro-contornos que disputam com os
    // dígitos reais — o borrão apaga variações menores que um dígito
    // sem apagar as bordas dos próprios dígitos (bem maiores).
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    // Limiar adaptativo (local), não Otsu (global): o recorte pode
    // conter, além do LCD, a moldura escura do aparelho e/ou fundo
    // claro (quando `detectDisplayQuad` não isola o visor). Um único
    // corte global não separa "dígito escuro sobre LCD claro" E
    // "moldura escura sobre fundo claro" ao mesmo tempo — cada região
    // teria um ponto de corte ideal diferente. Um limiar recalculado
    // por vizinhança captura o contraste local (dígito vs. LCD) onde
    // quer que ele esteja no recorte.
    const blockSize = oddAtLeast(Math.round(Math.min(mat.cols, mat.rows) / 4), 21);
    cv.adaptiveThreshold(blurred, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, blockSize, 10);
    cv.findContours(thresholded, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    // Contornos que tocam a borda do recorte são a moldura/fundo do
    // aparelho (ou o próprio contorno externo da imagem), nunca um
    // dígito: a instrução da tela de recorte pede para o usuário
    // cobrir só o visor, então um glifo real sempre fica com alguma
    // margem interna. Esse filtro importa sobretudo quando
    // `detectDisplayQuad` não isola o LCD (OTSU global então mistura o
    // contraste do visor com o da moldura escura ao redor, produzindo
    // um único contorno gigante em vez de dígitos separados).
    const borderMargin = Math.max(2, Math.round(Math.min(mat.cols, mat.rows) * 0.01));
    const touchesBorder = (box: BBox) =>
      box.x <= borderMargin ||
      box.y <= borderMargin ||
      box.x + box.width >= mat.cols - borderMargin ||
      box.y + box.height >= mat.rows - borderMargin;

    const boxes: BBox[] = [];
    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      try {
        const rect = cv.boundingRect(contour);
        const box: BBox = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        if (!touchesBorder(box)) boxes.push(box);
      } finally {
        contour.delete();
      }
    }

    const clusters = clusterContoursByRow(boxes, mat.rows);
    const containerBBox: BBox = { x: 0, y: 0, width: mat.cols, height: mat.rows };
    return pickBestCluster(clusters, containerBBox);
  } finally {
    gray.delete();
    blurred.delete();
    thresholded.delete();
    contours.delete();
    hierarchy.delete();
  }
}
