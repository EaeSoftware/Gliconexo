import { getDb, type StoredPreferences } from "@/lib/db/schema";

const LOCAL_ID = "local" as const;

export type TargetRange = {
  targetMinMgDl?: number;
  targetMaxMgDl?: number;
};

export const preferencesRepository = {
  async get(): Promise<StoredPreferences | null> {
    const db = getDb();
    const record = await db.preferences.get(LOCAL_ID);
    return record ?? null;
  },

  async save(input: TargetRange): Promise<StoredPreferences> {
    const db = getDb();
    const record: StoredPreferences = {
      id: LOCAL_ID,
      targetMinMgDl: input.targetMinMgDl,
      targetMaxMgDl: input.targetMaxMgDl,
      updatedAt: new Date().toISOString(),
    };
    await db.preferences.put(record);
    return record;
  },
};
