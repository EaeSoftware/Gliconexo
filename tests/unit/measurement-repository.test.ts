import { beforeEach, describe, expect, it } from "vitest";
import { measurementRepository } from "@/lib/db/measurement-repository";
import { getDb } from "@/lib/db/schema";

const baseInput = {
  valueMgDl: 110,
  measuredAt: "2026-08-28T08:30",
  context: "cafe_da_manha" as const,
  mealRelation: "depois" as const,
  source: "manual" as const,
};

beforeEach(async () => {
  await getDb().measurements.clear();
});

describe("measurementRepository", () => {
  it("cria uma medição com id, versão e timestamps", async () => {
    const created = await measurementRepository.create(baseInput);

    expect(created.id).toBeTruthy();
    expect(created.valueMgDl).toBe(110);
    expect(created.version).toBe(1);
    expect(created.deletedAt).toBeUndefined();
  });

  it("lista apenas medições não excluídas, mais recentes primeiro", async () => {
    const older = await measurementRepository.create({
      ...baseInput,
      measuredAt: "2026-08-20T08:00",
    });
    const newer = await measurementRepository.create({
      ...baseInput,
      measuredAt: "2026-08-27T08:00",
    });
    await measurementRepository.remove(older.id);

    const list = await measurementRepository.list();

    expect(list.map((m) => m.id)).toEqual([newer.id]);
  });

  it("getById retorna null para medição excluída", async () => {
    const created = await measurementRepository.create(baseInput);
    await measurementRepository.remove(created.id);

    expect(await measurementRepository.getById(created.id)).toBeNull();
  });

  it("update altera os campos e incrementa a versão", async () => {
    const created = await measurementRepository.create(baseInput);

    const updated = await measurementRepository.update(created.id, { valueMgDl: 130 });

    expect(updated.valueMgDl).toBe(130);
    expect(updated.version).toBe(2);
    expect(updated.context).toBe(baseInput.context); // preserva campos não alterados
  });

  it("restore desfaz uma exclusão lógica recente", async () => {
    const created = await measurementRepository.create(baseInput);
    await measurementRepository.remove(created.id);
    expect(await measurementRepository.getById(created.id)).toBeNull();

    await measurementRepository.restore(created.id);

    const restored = await measurementRepository.getById(created.id);
    expect(restored?.id).toBe(created.id);
    expect(restored?.deletedAt).toBeUndefined();
  });
});
