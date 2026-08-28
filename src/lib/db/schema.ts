import Dexie, { type EntityTable } from "dexie";
import type {
  MeasurementContext,
  MealRelation,
} from "@/features/measurements/constants";

/**
 * Registro de medição persistido localmente (IndexedDB).
 *
 * Ainda não há `user_id`: enquanto não existir autenticação real
 * (Fase 2), o app funciona com uma única "conta local" por dispositivo.
 * Quando a autenticação chegar, os registros precisarão ser escopados
 * por usuário e limpos no logout (CLAUDE.md, seção 13, "Privacidade
 * local").
 */
export interface StoredMeasurement {
  id: string;
  valueMgDl: number;
  /** ISO 8601, sempre em UTC. */
  measuredAt: string;
  /** Fuso horário IANA capturado no momento do registro (ex.: "America/Sao_Paulo"). */
  timezone: string;
  context: MeasurementContext;
  mealRelation: MealRelation;
  source: "manual" | "ocr";
  ocrConfidence?: number;
  ocrEngineVersion?: string;
  notes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Tombstone: presente quando o registro foi excluído (soft delete). */
  deletedAt?: string;
}

/**
 * Preferências locais do usuário (subconjunto de `user_preferences`,
 * CLAUDE.md seção 11.2). Registro único por dispositivo enquanto não
 * houver autenticação — `id` é sempre `"local"`.
 */
export interface StoredPreferences {
  id: "local";
  targetMinMgDl?: number;
  targetMaxMgDl?: number;
  updatedAt: string;
}

class GlicoNexoDB extends Dexie {
  measurements!: EntityTable<StoredMeasurement, "id">;
  preferences!: EntityTable<StoredPreferences, "id">;

  constructor() {
    super("gliconexo");
    this.version(1).stores({
      measurements: "id, measuredAt, updatedAt, deletedAt, context, source",
    });
    // Aditivo: mantém a tabela `measurements` da versão 1 intacta.
    this.version(2).stores({
      preferences: "id",
    });
  }
}

let dbInstance: GlicoNexoDB | null = null;

/**
 * Dexie só pode ser instanciado no navegador (depende de IndexedDB).
 * `getDb()` cria a instância sob demanda, evitando erro em SSR.
 */
export function getDb(): GlicoNexoDB {
  if (!dbInstance) {
    dbInstance = new GlicoNexoDB();
  }
  return dbInstance;
}
