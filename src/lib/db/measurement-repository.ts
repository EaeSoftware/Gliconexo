import { getDb, type StoredMeasurement } from "@/lib/db/schema";
import type {
  MeasurementContext,
  MealRelation,
} from "@/features/measurements/constants";

export type GlucoseMeasurement = StoredMeasurement;

export type CreateMeasurementInput = {
  valueMgDl: number;
  /** Formato de `<input type="datetime-local">`, interpretado no horário local do dispositivo. */
  measuredAt: string;
  context: MeasurementContext;
  mealRelation: MealRelation;
  notes?: string;
  source: "manual" | "ocr";
  ocrConfidence?: number;
  ocrEngineVersion?: string;
};

export type UpdateMeasurementInput = Partial<
  Pick<CreateMeasurementInput, "valueMgDl" | "measuredAt" | "context" | "mealRelation" | "notes">
>;

function localDateTimeToIso(value: string): string {
  // "datetime-local" não inclui fuso; interpretamos como horário local do dispositivo.
  return new Date(value).toISOString();
}

/**
 * Implementação local (IndexedDB/Dexie) de `MeasurementRepository`
 * (CLAUDE.md, seção 6). Ainda não sincroniza com o Supabase — isso é a
 * Fase 4 (outbox + fila de sincronização).
 */
export const measurementRepository = {
  async list(options: { includeDeleted?: boolean } = {}): Promise<GlucoseMeasurement[]> {
    const db = getDb();
    const all = await db.measurements.orderBy("measuredAt").reverse().toArray();
    if (options.includeDeleted) return all;
    return all.filter((m) => !m.deletedAt);
  },

  async getById(id: string): Promise<GlucoseMeasurement | null> {
    const db = getDb();
    const record = await db.measurements.get(id);
    if (!record || record.deletedAt) return null;
    return record;
  },

  async create(input: CreateMeasurementInput): Promise<GlucoseMeasurement> {
    const db = getDb();
    const now = new Date().toISOString();
    const record: StoredMeasurement = {
      id: crypto.randomUUID(),
      valueMgDl: input.valueMgDl,
      measuredAt: localDateTimeToIso(input.measuredAt),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      context: input.context,
      mealRelation: input.mealRelation,
      source: input.source,
      ocrConfidence: input.ocrConfidence,
      ocrEngineVersion: input.ocrEngineVersion,
      notes: input.notes,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    await db.measurements.add(record);
    return record;
  },

  async update(id: string, input: UpdateMeasurementInput): Promise<GlucoseMeasurement> {
    const db = getDb();
    const existing = await db.measurements.get(id);
    if (!existing) {
      throw new Error("Medição não encontrada.");
    }

    const updated: StoredMeasurement = {
      ...existing,
      valueMgDl: input.valueMgDl ?? existing.valueMgDl,
      measuredAt: input.measuredAt ? localDateTimeToIso(input.measuredAt) : existing.measuredAt,
      context: input.context ?? existing.context,
      mealRelation: input.mealRelation ?? existing.mealRelation,
      notes: input.notes ?? existing.notes,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await db.measurements.put(updated);
    return updated;
  },

  /**
   * Exclusão lógica (tombstone), conforme CLAUDE.md seção 13. A foto do
   * visor, se existir, é apagada junto: o tombstone fica para a
   * sincronização, mas a foto nunca é sincronizada e não deve sobrar no
   * aparelho depois que o usuário excluiu a medição.
   */
  async remove(id: string): Promise<void> {
    const db = getDb();
    const existing = await db.measurements.get(id);
    if (!existing) return;
    await db.transaction("rw", db.measurements, db.ocrImages, async () => {
      await db.measurements.put({
        ...existing,
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: existing.version + 1,
      });
      await db.ocrImages.delete(id);
    });
  },

  /** Desfaz uma exclusão lógica recente (janela curta de "desfazer" na UI). */
  async restore(id: string): Promise<void> {
    const db = getDb();
    const existing = await db.measurements.get(id);
    if (!existing) return;
    const restored: StoredMeasurement = { ...existing };
    delete restored.deletedAt;
    restored.updatedAt = new Date().toISOString();
    restored.version = existing.version + 1;
    await db.measurements.put(restored);
  },
};
