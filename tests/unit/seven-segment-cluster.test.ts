import { describe, expect, it } from "vitest";
import {
  clusterContoursByRow,
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
