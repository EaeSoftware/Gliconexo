import { beforeEach, describe, expect, it } from "vitest";
import { preferencesRepository } from "@/lib/db/preferences-repository";
import { getDb } from "@/lib/db/schema";

beforeEach(async () => {
  await getDb().preferences.clear();
});

describe("preferencesRepository", () => {
  it("retorna null quando não há preferências salvas", async () => {
    expect(await preferencesRepository.get()).toBeNull();
  });

  it("salva e recupera a faixa configurada", async () => {
    await preferencesRepository.save({ targetMinMgDl: 70, targetMaxMgDl: 180 });

    const saved = await preferencesRepository.get();

    expect(saved?.targetMinMgDl).toBe(70);
    expect(saved?.targetMaxMgDl).toBe(180);
    expect(saved?.id).toBe("local");
  });

  it("sobrescreve a faixa anterior ao salvar novamente", async () => {
    await preferencesRepository.save({ targetMinMgDl: 70, targetMaxMgDl: 180 });
    await preferencesRepository.save({ targetMinMgDl: 80, targetMaxMgDl: 160 });

    const saved = await preferencesRepository.get();

    expect(saved?.targetMinMgDl).toBe(80);
    expect(saved?.targetMaxMgDl).toBe(160);
  });
});
