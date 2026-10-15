import { beforeEach, describe, expect, it } from "vitest";
import { measurementRepository } from "@/lib/db/measurement-repository";
import { ocrImageRepository } from "@/lib/db/ocr-image-repository";
import { getDb } from "@/lib/db/schema";

const baseInput = {
  valueMgDl: 103,
  measuredAt: "2026-08-28T08:30",
  context: "cafe_da_manha" as const,
  mealRelation: "antes" as const,
  source: "ocr" as const,
};

// Nota: o `fake-indexeddb` clona o `Blob` do jsdom como objeto simples (um navegador real guarda o
// Blob de verdade), então estes testes verificam presença/chaves/metadados, não o tamanho do blob.
// O blob real é conferido na verificação manual no navegador.
function fakePhoto(type = "image/jpeg") {
  return new Blob(["foto"], { type });
}

beforeEach(async () => {
  await getDb().measurements.clear();
  await getDb().ocrImages.clear();
});

describe("ocrImageRepository", () => {
  it("guarda e devolve a foto de uma medição", async () => {
    const measurement = await measurementRepository.create(baseInput);
    await ocrImageRepository.save(measurement.id, fakePhoto());

    const stored = await ocrImageRepository.get(measurement.id);

    expect(stored?.measurementId).toBe(measurement.id);
    expect(stored?.mimeType).toBe("image/jpeg");
    expect(stored?.blob).toBeDefined();
  });

  it("devolve null quando a medição não tem foto", async () => {
    expect(await ocrImageRepository.get("nao-existe")).toBeNull();
  });

  it("regravar a foto da mesma medição substitui a anterior (sem duplicar)", async () => {
    const measurement = await measurementRepository.create(baseInput);
    await ocrImageRepository.save(measurement.id, fakePhoto("image/jpeg"));
    await ocrImageRepository.save(measurement.id, fakePhoto("image/png"));

    expect(await getDb().ocrImages.count()).toBe(1);
    expect((await ocrImageRepository.get(measurement.id))?.mimeType).toBe("image/png");
  });

  it("remove só a foto, mantendo a medição", async () => {
    const measurement = await measurementRepository.create(baseInput);
    await ocrImageRepository.save(measurement.id, fakePhoto());

    await ocrImageRepository.remove(measurement.id);

    expect(await ocrImageRepository.get(measurement.id)).toBeNull();
    expect(await measurementRepository.getById(measurement.id)).not.toBeNull();
  });

  it("lista só as fotos das medições pedidas", async () => {
    const a = await measurementRepository.create(baseInput);
    const b = await measurementRepository.create(baseInput);
    const c = await measurementRepository.create(baseInput);
    await ocrImageRepository.save(a.id, fakePhoto());
    await ocrImageRepository.save(c.id, fakePhoto());

    const found = await ocrImageRepository.listForMeasurements([a.id, b.id]);

    expect([...found.keys()]).toEqual([a.id]);
  });

  it("apaga a foto quando a medição é excluída", async () => {
    const measurement = await measurementRepository.create(baseInput);
    await ocrImageRepository.save(measurement.id, fakePhoto());

    await measurementRepository.remove(measurement.id);

    expect(await ocrImageRepository.get(measurement.id)).toBeNull();
  });

  it("desfazer a exclusão não traz a foto de volta por conta própria", async () => {
    const measurement = await measurementRepository.create(baseInput);
    await ocrImageRepository.save(measurement.id, fakePhoto());
    await measurementRepository.remove(measurement.id);

    await measurementRepository.restore(measurement.id);

    // Quem oferece o "desfazer" (histórico) é quem regrava a foto, guardada só em memória.
    expect(await ocrImageRepository.get(measurement.id)).toBeNull();
  });
});
