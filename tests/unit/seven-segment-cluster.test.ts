import { describe, expect, it } from "vitest";
import {
  clusterContoursByRow,
  mergeOverlappingBoxes,
  mergeSameRowClusters,
  pickBestCluster,
  scoreCluster,
} from "@/features/ocr/seven-segment/crop-main-reading";
import type { BBox, DigitCluster } from "@/features/ocr/seven-segment/types";

const CONTAINER: BBox = { x: 0, y: 0, width: 300, height: 220 };

describe("clusterContoursByRow", () => {
  it("descarta contornos pequenos demais (ruído, pontos, ícones)", () => {
    const boxes: BBox[] = [
      { x: 60, y: 100, width: 40, height: 90 }, // dígito grande
      { x: 5, y: 5, width: 4, height: 4 }, // ruído
    ];
    const clusters = clusterContoursByRow(boxes, CONTAINER.height);
    const allBoxes = clusters.flatMap((c) => c.digitBoxes);
    expect(allBoxes).toHaveLength(1);
  });

  it("agrupa na mesma linha caixas com centro vertical e altura similares", () => {
    const boxes: BBox[] = [
      { x: 60, y: 100, width: 40, height: 90 },
      { x: 110, y: 105, width: 40, height: 85 },
      { x: 160, y: 100, width: 40, height: 90 },
    ];
    const clusters = clusterContoursByRow(boxes, CONTAINER.height);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].digitBoxes).toHaveLength(3);
  });

  it("separa em clusters diferentes glifos de tamanho muito diferente mesmo alinhados", () => {
    const bigDigit: BBox = { x: 60, y: 100, width: 40, height: 90 };
    const smallDigit: BBox = { x: 60, y: 130, width: 15, height: 20 };
    const clusters = clusterContoursByRow([bigDigit, smallDigit], CONTAINER.height);
    // smallDigit (altura 20) é descartado pelo filtro de altura mínima (15% de 220 = 33).
    expect(clusters).toHaveLength(1);
    expect(clusters[0].digitBoxes).toEqual([bigDigit]);
  });
});

describe("scoreCluster", () => {
  it("pontua mais alto um cluster grande e central do que um pequeno e periférico", () => {
    const bigCentral: DigitCluster = {
      bbox: { x: 60, y: 100, width: 140, height: 90 },
      digitBoxes: [
        { x: 60, y: 100, width: 40, height: 90 },
        { x: 110, y: 105, width: 40, height: 85 },
        { x: 160, y: 100, width: 40, height: 90 },
      ],
    };
    const smallPeripheral: DigitCluster = {
      bbox: { x: 10, y: 10, width: 45, height: 40 },
      digitBoxes: [
        { x: 10, y: 10, width: 20, height: 40 },
        { x: 35, y: 10, width: 20, height: 40 },
      ],
    };

    const bigScore = scoreCluster(bigCentral, CONTAINER);
    const smallScore = scoreCluster(smallPeripheral, CONTAINER);
    expect(bigScore).toBeGreaterThan(smallScore);
  });

  it("penaliza fortemente clusters com mais de 3 dígitos", () => {
    const withinRange: DigitCluster = {
      bbox: { x: 60, y: 100, width: 140, height: 90 },
      digitBoxes: [
        { x: 60, y: 100, width: 40, height: 90 },
        { x: 110, y: 105, width: 40, height: 85 },
        { x: 160, y: 100, width: 40, height: 90 },
      ],
    };
    const tooManyDigits: DigitCluster = {
      ...withinRange,
      digitBoxes: [...withinRange.digitBoxes, { x: 210, y: 100, width: 40, height: 90 }],
    };

    expect(scoreCluster(tooManyDigits, CONTAINER)).toBeLessThan(scoreCluster(withinRange, CONTAINER));
  });
});

describe("pickBestCluster", () => {
  it("escolhe o cluster '103' grande e central em vez do relógio pequeno e do contador pequeno", () => {
    // Layout sintético: "103" grande e central; "11:54" pequeno no canto
    // superior esquerdo; "288" pequeno no canto superior direito.
    const bigReading: BBox[] = [
      { x: 60, y: 100, width: 40, height: 90 },
      { x: 110, y: 105, width: 40, height: 85 },
      { x: 160, y: 100, width: 40, height: 90 },
    ];
    const clock: BBox[] = [
      { x: 10, y: 10, width: 20, height: 40 },
      { x: 35, y: 10, width: 20, height: 40 },
    ];
    const memoryCount: BBox[] = [
      { x: 200, y: 10, width: 20, height: 40 },
      { x: 225, y: 10, width: 20, height: 40 },
      { x: 250, y: 10, width: 20, height: 40 },
    ];

    const clusters = clusterContoursByRow([...bigReading, ...clock, ...memoryCount], CONTAINER.height);
    const best = pickBestCluster(clusters, CONTAINER);

    expect(best).not.toBeNull();
    expect(best?.digitBoxes).toHaveLength(3);
    expect(best?.bbox.y).toBeGreaterThan(90); // é o cluster de baixo (o número grande), não o de cima
  });

  it("retorna null quando nenhum cluster atinge a pontuação mínima", () => {
    // Muito longe do centro do contêiner (fora da ROI) — pontuação de centralidade negativa.
    const farOutside: DigitCluster = {
      bbox: { x: -1000, y: -1000, width: 5, height: 5 },
      digitBoxes: [{ x: -1000, y: -1000, width: 5, height: 5 }],
    };
    expect(pickBestCluster([farOutside], CONTAINER)).toBeNull();
  });

  it("retorna null para lista de clusters vazia", () => {
    expect(pickBestCluster([], CONTAINER)).toBeNull();
  });
});

describe("mergeOverlappingBoxes", () => {
  it("funde duas caixas quase idênticas (mesmo dígito, detectado por dois tamanhos de vizinhança) numa só", () => {
    // Simula a metade superior de um dígito (vizinhança grande, sob luz
    // desigual) e o dígito completo (vizinhança pequena) — a fusão deve
    // ficar com a extensão completa (união), não as duas separadas.
    const partial: BBox = { x: 100, y: 140, width: 40, height: 45 };
    const complete: BBox = { x: 100, y: 100, width: 40, height: 90 };

    const merged = mergeOverlappingBoxes([partial, complete]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual({ x: 100, y: 100, width: 40, height: 90 });
  });

  it("mantém caixas separadas quando não há sobreposição significativa (dígitos distintos)", () => {
    const digitOne: BBox = { x: 60, y: 100, width: 40, height: 90 };
    const digitTwo: BBox = { x: 160, y: 100, width: 40, height: 90 };

    const merged = mergeOverlappingBoxes([digitOne, digitTwo]);

    expect(merged).toHaveLength(2);
  });

  it("reduz 6 caixas duplicadas (3 dígitos x 2 passagens de limiar) de volta a 3", () => {
    const pass1: BBox[] = [
      { x: 60, y: 100, width: 40, height: 90 },
      { x: 110, y: 100, width: 40, height: 90 },
      { x: 160, y: 100, width: 40, height: 90 },
    ];
    const pass2: BBox[] = [
      { x: 62, y: 105, width: 38, height: 80 },
      { x: 112, y: 105, width: 38, height: 80 },
      { x: 162, y: 105, width: 38, height: 80 },
    ];

    const merged = mergeOverlappingBoxes([...pass1, ...pass2]);

    expect(merged).toHaveLength(3);
  });
});

describe("mergeSameRowClusters", () => {
  it("funde de volta dígitos da mesma leitura que o agrupamento por contorno separou (ex.: '1' isolado de '03' numa foto com leve inclinação)", () => {
    // Mesmo cenário de "103", mas o dígito do meio ("0") ficou um pouco
    // mais baixo que a tolerância de `clusterContoursByRow` — situação
    // plausível numa foto real com perspectiva imperfeita — quebrando
    // a cadeia de agrupamento em dois clusters: "1" sozinho e "0"+"3".
    const one: DigitCluster = {
      bbox: { x: 60, y: 100, width: 40, height: 90 },
      digitBoxes: [{ x: 60, y: 100, width: 40, height: 90 }],
    };
    const zeroThree: DigitCluster = {
      bbox: { x: 110, y: 118, width: 90, height: 88 },
      digitBoxes: [
        { x: 110, y: 118, width: 40, height: 88 },
        { x: 160, y: 118, width: 40, height: 88 },
      ],
    };
    const clusters = [one, zeroThree];

    const merged = mergeSameRowClusters(one, clusters);

    expect(merged.digitBoxes).toHaveLength(3);
    expect(merged.digitBoxes.map((box) => box.x)).toEqual([60, 110, 160]);
  });

  it("não funde com o relógio/contador pequenos, mesmo alinhados na mesma altura de centro", () => {
    const bigDigit: DigitCluster = {
      bbox: { x: 60, y: 100, width: 40, height: 90 },
      digitBoxes: [{ x: 60, y: 100, width: 40, height: 90 }],
    };
    const smallClock: DigitCluster = {
      bbox: { x: 10, y: 130, width: 20, height: 30 },
      digitBoxes: [{ x: 10, y: 130, width: 20, height: 30 }],
    };

    const merged = mergeSameRowClusters(bigDigit, [bigDigit, smallClock]);

    expect(merged).toBe(bigDigit);
  });

  it("não funde se o resultado ultrapassar o máximo de dígitos válidos (1-999)", () => {
    const three: DigitCluster = {
      bbox: { x: 60, y: 100, width: 120, height: 90 },
      digitBoxes: [
        { x: 60, y: 100, width: 40, height: 90 },
        { x: 100, y: 100, width: 40, height: 90 },
        { x: 140, y: 100, width: 40, height: 90 },
      ],
    };
    const oneMore: DigitCluster = {
      bbox: { x: 190, y: 100, width: 40, height: 90 },
      digitBoxes: [{ x: 190, y: 100, width: 40, height: 90 }],
    };

    const merged = mergeSameRowClusters(three, [three, oneMore]);

    expect(merged).toBe(three);
  });

  it("retorna o próprio cluster quando não há outro para fundir", () => {
    const only: DigitCluster = {
      bbox: { x: 60, y: 100, width: 40, height: 90 },
      digitBoxes: [{ x: 60, y: 100, width: 40, height: 90 }],
    };
    expect(mergeSameRowClusters(only, [only])).toBe(only);
  });
});
