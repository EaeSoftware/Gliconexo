import { getDb } from "@/lib/db/schema";

export type LocalDataSummary = {
  /** Medições ativas (não excluídas) guardadas neste aparelho. */
  measurements: number;
  /** Fotos do visor guardadas neste aparelho. */
  photos: number;
};

/**
 * Quanto do que o usuário registrou existe só neste aparelho. Enquanto a
 * sincronização com a nuvem não existir (Fase 4), tudo o que está no
 * IndexedDB é a única cópia: apagar no logout sem avisar é perda de dados
 * (CLAUDE.md seções 10.2 e 17, regra 11).
 */
export async function getLocalDataSummary(): Promise<LocalDataSummary> {
  const db = getDb();
  const [measurements, photos] = await Promise.all([
    db.measurements.filter((measurement) => !measurement.deletedAt).count(),
    db.ocrImages.count(),
  ]);
  return { measurements, photos };
}

export function hasLocalData(summary: LocalDataSummary): boolean {
  return summary.measurements > 0 || summary.photos > 0;
}
