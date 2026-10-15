import { getDb, type StoredOcrImage } from "@/lib/db/schema";

/**
 * Fotos do visor guardadas localmente (IndexedDB), uma por medição. A foto
 * só é gravada quando o usuário deixa ligada a opção "Guardar foto do
 * visor neste aparelho" no registro por câmera, e nunca é enviada a
 * servidor (CLAUDE.md, seção 17, regra 10).
 */
export const ocrImageRepository = {
  async save(measurementId: string, blob: Blob): Promise<void> {
    await getDb().ocrImages.put({
      measurementId,
      blob,
      mimeType: blob.type || "image/jpeg",
      createdAt: new Date().toISOString(),
    });
  },

  async get(measurementId: string): Promise<StoredOcrImage | null> {
    return (await getDb().ocrImages.get(measurementId)) ?? null;
  },

  async remove(measurementId: string): Promise<void> {
    await getDb().ocrImages.delete(measurementId);
  },

  /** Fotos das medições informadas, indexadas por `measurementId`. */
  async listForMeasurements(measurementIds: string[]): Promise<Map<string, StoredOcrImage>> {
    const found = await getDb().ocrImages.bulkGet(measurementIds);
    const result = new Map<string, StoredOcrImage>();
    for (const image of found) {
      if (image) result.set(image.measurementId, image);
    }
    return result;
  },
};
