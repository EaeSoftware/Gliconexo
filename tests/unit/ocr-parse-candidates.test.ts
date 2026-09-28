import { describe, expect, it } from "vitest";
import {
  joinSplitDigitGroups,
  normalizeLookalikeDigits,
  parseNumericCandidates,
  pickBestCandidate,
} from "@/features/ocr/parse-candidates";

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

describe("normalizeLookalikeDigits", () => {
  it("troca letras parecidas por dígitos dentro de trechos numéricos", () => {
    expect(normalizeLookalikeDigits("1O3")).toBe("103");
    expect(normalizeLookalikeDigits("1S")).toBe("15");
    expect(normalizeLookalikeDigits("l2B")).toBe("128");
  });

  it("não inventa números a partir de palavras sem nenhum dígito", () => {
    expect(normalizeLookalikeDigits("mg/dL")).toBe("mg/dL");
    expect(normalizeLookalikeDigits("Accu-CHEK")).toBe("Accu-CHEK");
    expect(normalizeLookalikeDigits("LO")).toBe("LO");
    expect(parseNumericCandidates("mg/dL")).toEqual([]);
  });

  it("é aplicado por parseNumericCandidates", () => {
    expect(parseNumericCandidates("1O3 mg/dL")).toEqual([103]);
  });
});

describe("joinSplitDigitGroups", () => {
  it("junta grupos separados por espaço que formam 2-3 dígitos", () => {
    expect(joinSplitDigitGroups("1 03")).toBe(103);
    expect(joinSplitDigitGroups("9 6")).toBe(96);
    expect(joinSplitDigitGroups(" 1  2 0 ")).toBe(120);
  });

  it("não junta quando o resultado teria mais de 3 dígitos", () => {
    expect(joinSplitDigitGroups("54 288")).toBeNull();
    expect(joinSplitDigitGroups("118 118 95")).toBeNull();
  });

  it("não junta relógio nem texto com outros separadores", () => {
    expect(joinSplitDigitGroups("1:54")).toBeNull();
    expect(joinSplitDigitGroups("103")).toBeNull();
    expect(joinSplitDigitGroups("1 03 mg")).toBeNull();
  });
});
