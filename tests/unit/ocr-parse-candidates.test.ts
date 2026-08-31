import { describe, expect, it } from "vitest";
import { parseNumericCandidates, pickBestCandidate } from "@/features/ocr/parse-candidates";

describe("parseNumericCandidates", () => {
  it("extrai um número simples", () => {
    expect(parseNumericCandidates("118")).toEqual([118]);
  });

  it("ignora espaços e quebras de linha ao redor do número", () => {
    expect(parseNumericCandidates("\n 95 \n")).toEqual([95]);
  });

  it("rejeita texto sem nenhum dígito", () => {
    expect(parseNumericCandidates("")).toEqual([]);
    expect(parseNumericCandidates("mg/dL")).toEqual([]);
    expect(parseNumericCandidates("   \n")).toEqual([]);
  });

  it("descarta números fora do intervalo 1-999", () => {
    expect(parseNumericCandidates("0")).toEqual([]);
    expect(parseNumericCandidates("1000")).toEqual([]);
    expect(parseNumericCandidates("99999")).toEqual([]);
  });

  it("retorna múltiplos candidatos válidos sem duplicar", () => {
    expect(parseNumericCandidates("118 118 95")).toEqual([118, 95]);
  });

  it("aceita o valor no limite da faixa (1 e 999)", () => {
    expect(parseNumericCandidates("1")).toEqual([1]);
    expect(parseNumericCandidates("999")).toEqual([999]);
  });
});

describe("pickBestCandidate", () => {
  it("retorna null para lista vazia", () => {
    expect(pickBestCandidate([])).toBeNull();
  });

  it("com um único candidato, retorna ele mesmo", () => {
    expect(pickBestCandidate([118])).toBe(118);
  });

  it("prefere o candidato com mais dígitos, mesmo que apareça depois", () => {
    // ruído do OCR (traço, ponto) costuma virar um dígito avulso antes
    // ou depois do valor real do visor.
    expect(pickBestCandidate([1, 118])).toBe(118);
    expect(pickBestCandidate([118, 1])).toBe(118);
  });

  it("em empate de dígitos, usa a ordem de leitura como desempate", () => {
    expect(pickBestCandidate([118, 95])).toBe(118);
  });
});
