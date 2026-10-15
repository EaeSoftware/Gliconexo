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

/**
 * Foto recortada do visor (a que o usuário confirmou no fluxo de OCR),
 * guardada só neste aparelho e só quando ele deixa a opção ligada. Fica em
 * uma tabela própria — fora de `measurements` — para não inflar a leitura
 * do histórico nem entrar nos exports CSV/JSON. Some junto com a medição.
 */
export interface StoredOcrImage {
  /** Mesmo `id` da medição a que a foto pertence. */
  measurementId: string;
  blob: Blob;
  mimeType: string;
  createdAt: string;
}

class GlicoNexoDB extends Dexie {
  measurements!: EntityTable<StoredMeasurement, "id">;
  preferences!: EntityTable<StoredPreferences, "id">;
  ocrImages!: EntityTable<StoredOcrImage, "measurementId">;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      measurements: "id, measuredAt, updatedAt, deletedAt, context, source",
    });
    // Aditivo: mantém a tabela `measurements` da versão 1 intacta.
    this.version(2).stores({
      preferences: "id",
    });
    // Aditivo: fotos do visor, opcionais e locais.
    this.version(3).stores({
      ocrImages: "measurementId",
    });
  }
}

let dbInstance: GlicoNexoDB | null = null;
let activeUserId: string | null = null;

/** Um banco IndexedDB por usuário: evita que dados de uma conta vazem para outra no mesmo dispositivo. */
function dbNameFor(userId: string | null): string {
  return userId ? `gliconexo-${userId}` : "gliconexo-anon";
}

/**
 * Dexie só pode ser instanciado no navegador (depende de IndexedDB).
 * `getDb()` cria a instância sob demanda, evitando erro em SSR.
 */
export function getDb(): GlicoNexoDB {
  if (!dbInstance) {
    dbInstance = new GlicoNexoDB(dbNameFor(activeUserId));
  }
  return dbInstance;
}

/**
 * Troca o "usuário ativo" do banco local. Fecha a instância aberta para
 * que a próxima `getDb()` abra o banco IndexedDB correto (escopado por
 * `userId`). Precisa ser chamada antes de qualquer leitura/escrita da
 * sessão — ver `LocalDbUserSync`, que a chama durante o render (não em
 * efeito) para evitar corrida com repositórios que leem dados em seus
 * próprios efeitos assim que montam.
 */
export function setActiveUser(userId: string | null): void {
  if (userId === activeUserId) return;
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  activeUserId = userId;
}

/** Apaga o IndexedDB do usuário atualmente ativo (CLAUDE.md seção 13: limpar dados locais após logout). */
export async function clearActiveUserLocalData(): Promise<void> {
  const name = dbNameFor(activeUserId);
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  await Dexie.delete(name);
}

/**
 * Apaga o banco local do usuário ativo. Usado depois de excluir a conta,
 * para que nenhum dado privado permaneça no aparelho. Alias de
 * `clearActiveUserLocalData` mantido para compatibilidade com o fluxo de
 * exclusão de conta.
 */
export async function deleteLocalDatabase(): Promise<void> {
  await clearActiveUserLocalData();
}
