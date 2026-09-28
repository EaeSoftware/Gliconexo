import { describe, expect, it } from "vitest";
import { extractNumericBlocks, pickMainReading } from "@/features/ocr/paddle-ocr-provider";

describe("extractNumericBlocks", () => {
  it("extrai o número principal de um bloco simples", () => {
    const blocks = [{ text: "103", box: { width: 345, height: 212 }, confidence: 0.99 }];
    expect(extractNumericBlocks(blocks)).toEqual([
      { value: 103, confidence: 0.99, height: 212, area: 345 * 212, otherValuesInBlock: [] },
    ]);
  });

  it("descarta blocos sem nenhum número válido", () => {
    const blocks = [{ text: "mg/dL", box: { width: 153, height: 41 }, confidence: 0.9 }];
    expect(extractNumericBlocks(blocks)).toEqual([]);
  });

  it("escolhe o número com mais dígitos dentro de um bloco com vários (ex.: relógio + contador colados)", () => {
    const blocks = [{ text: "1:54 288", box: { width: 255, height: 78 }, confidence: 0.6 }];
    const result = extractNumericBlocks(blocks);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(288);
    expect(result[0].otherValuesInBlock.sort()).toEqual([1, 54]);
  });
});

describe("pickMainReading", () => {
  it("retorna null quando não há blocos", () => {
    expect(pickMainReading([])).toBeNull();
  });

  it("escolhe o bloco de maior área como leitura principal (visor real: '103' grande vs. relógio/contador pequenos)", () => {
    const blocks = extractNumericBlocks([
      { text: "Accu-CHEK", box: { width: 312, height: 83 }, confidence: 0.93 },
      { text: "1S 288", box: { width: 255, height: 78 }, confidence: 0.6 },
      { text: "103", box: { width: 345, height: 212 }, confidence: 0.91 },
      { text: "mg/dL", box: { width: 153, height: 41 }, confidence: 0.9 },
    ]);
    const reading = pickMainReading(blocks);
    expect(reading).not.toBeNull();
    expect(reading?.value).toBe(103);
    expect(reading?.confidence).toBe(0.91);
    expect(reading?.candidates).toContain(288);
  });

  it("coloca os números secundários do próprio bloco vencedor também como candidatos", () => {
    const blocks = extractNumericBlocks([{ text: "103 1:54 288", box: { width: 400, height: 200 }, confidence: 0.95 }]);
    const reading = pickMainReading(blocks);
    expect(reading?.value).toBe(103);
    expect(reading?.candidates.sort((a, b) => a - b)).toEqual([1, 54, 288]);
  });

  it("prefere o bloco mais alto mesmo quando outro bloco (relógio largo) tem mais área", () => {
    const blocks = extractNumericBlocks([
      { text: "12:45", box: { width: 600, height: 90 }, confidence: 0.95 },
      { text: "96", box: { width: 220, height: 180 }, confidence: 0.8 },
    ]);
    expect(pickMainReading(blocks)?.value).toBe(96);
  });

  it("junta dígitos separados pelo vão do display de 7 segmentos ('1 03' → 103)", () => {
    const blocks = extractNumericBlocks([{ text: "1 03", box: { width: 300, height: 200 }, confidence: 0.8 }]);
    expect(blocks[0].value).toBe(103);
  });

  it("corrige letras lidas no lugar de dígitos ('1O3' → 103)", () => {
    const blocks = extractNumericBlocks([{ text: "1O3", box: { width: 300, height: 200 }, confidence: 0.8 }]);
    expect(blocks[0].value).toBe(103);
  });

  it("nunca inclui o valor escolhido na lista de candidatos", () => {
    const blocks = extractNumericBlocks([
      { text: "103", box: { width: 300, height: 200 }, confidence: 0.9 },
      { text: "103", box: { width: 10, height: 10 }, confidence: 0.5 },
    ]);
    const reading = pickMainReading(blocks);
    expect(reading?.candidates).not.toContain(103);
  });
});
