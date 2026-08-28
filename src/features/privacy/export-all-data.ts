import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import type { StoredPreferences } from "@/lib/db/schema";

export type AllDataExport = {
  app: "GlicoNexo";
  exportFormatVersion: 1;
  exportedAt: string;
  measurements: GlucoseMeasurement[];
  preferences: {
    targetMinMgDl?: number;
    targetMaxMgDl?: number;
  } | null;
};

/**
 * Monta o export completo dos dados locais do usuário (CLAUDE.md, seção
 * 15, "formulario de privacidade com exportacao e exclusao"). Inclui
 * apenas medições ativas (não excluídas) — o mesmo conjunto que o
 * usuário vê no histórico. Como ainda não há conta remota, isto é tudo
 * o que o GlicoNexo guarda sobre o usuário neste dispositivo.
 */
export function buildAllDataExport(
  measurements: GlucoseMeasurement[],
  preferences: StoredPreferences | null,
  now: Date = new Date(),
): AllDataExport {
  return {
    app: "GlicoNexo",
    exportFormatVersion: 1,
    exportedAt: now.toISOString(),
    measurements: measurements.filter((m) => !m.deletedAt),
    preferences:
      preferences?.targetMinMgDl != null && preferences?.targetMaxMgDl != null
        ? {
            targetMinMgDl: preferences.targetMinMgDl,
            targetMaxMgDl: preferences.targetMaxMgDl,
          }
        : null,
  };
}
