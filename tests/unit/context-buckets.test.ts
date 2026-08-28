import { describe, expect, it } from "vitest";
import { bucketForContext } from "@/features/measurements/context-buckets";
import { MEASUREMENT_CONTEXTS } from "@/features/measurements/constants";

describe("bucketForContext", () => {
  it("mantém café da manhã, almoço, lanche da tarde e jantar como baldes próprios", () => {
    expect(bucketForContext("cafe_da_manha")).toBe("cafe_da_manha");
    expect(bucketForContext("almoco")).toBe("almoco");
    expect(bucketForContext("lanche_da_tarde")).toBe("lanche_da_tarde");
    expect(bucketForContext("jantar")).toBe("jantar");
  });

  it("agrupa os demais contextos em 'outros'", () => {
    expect(bucketForContext("jejum")).toBe("outros");
    expect(bucketForContext("antes_de_dormir")).toBe("outros");
    expect(bucketForContext("madrugada")).toBe("outros");
    expect(bucketForContext("atividade_fisica")).toBe("outros");
    expect(bucketForContext("outro")).toBe("outros");
  });

  it("cobre todos os contextos suportados sem lançar erro", () => {
    for (const context of MEASUREMENT_CONTEXTS) {
      expect(() => bucketForContext(context)).not.toThrow();
    }
  });
});
