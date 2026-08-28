"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { filterMeasurements, type PeriodFilter } from "@/features/measurements/filter-measurements";
import { PeriodSelect } from "@/features/measurements/components/period-select";
import { buildMeasurementsCsv } from "@/features/reports/csv";
import { formatMeasurementCount } from "@/features/measurements/pluralize";
import { shareOrDownloadFile, canShareFiles } from "@/lib/export/download-file";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { FileText } from "lucide-react";

function periodFilenamePart(period: PeriodFilter): string {
  if (period === "all") return "tudo";
  return `${period}dias`;
}

export function ExportPanel() {
  const [period, setPeriod] = useState<PeriodFilter>(30);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const measurements = useLiveQuery(
    () => getDb().measurements.filter((m) => !m.deletedAt).toArray(),
    [],
  );

  if (measurements === undefined) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-foreground/60">
        Carregando...
      </p>
    );
  }

  if (measurements.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nenhum dado para exportar ainda"
        description="Assim que você tiver medições registradas, poderá escolher um período e exportar em CSV."
      />
    );
  }

  const filtered = filterMeasurements(measurements, {
    period,
    context: "all",
    origin: "all",
    range: "all",
  });

  async function handleExportCsv() {
    setIsExporting(true);
    setStatus(null);
    try {
      const csv = buildMeasurementsCsv(filtered, { includeNotes });
      const today = new Intl.DateTimeFormat("sv-SE").format(new Date());
      const result = await shareOrDownloadFile(
        {
          content: csv,
          filename: `gliconexo-medicoes-${periodFilenamePart(period)}-${today}.csv`,
          mimeType: "text/csv;charset=utf-8",
        },
        { title: "Medições GlicoNexo" },
      );

      if (result === "shared") setStatus("Arquivo compartilhado.");
      else if (result === "downloaded") setStatus("Arquivo CSV baixado.");
      // "cancelled": o usuário fechou a folha de compartilhamento — nada a informar.
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <PeriodSelect value={period} onChange={setPeriod} />

        <label className="mt-3 flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={includeNotes}
            onChange={(event) => setIncludeNotes(event.target.checked)}
          />
          Incluir observações no arquivo
        </label>

        <p className="mt-3 text-sm text-foreground/60">
          {formatMeasurementCount(filtered.length)} no período selecionado.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            disabled={isExporting || filtered.length === 0}
            onClick={handleExportCsv}
          >
            {canShareFiles() ? "Compartilhar CSV" : "Baixar CSV"}
          </Button>
        </div>

        {status ? (
          <p role="status" className="mt-3 text-sm text-status-within">
            {status}
          </p>
        ) : null}
      </div>

      <p className="text-xs text-foreground/50">
        Exportação em PDF ainda não foi implementada — disponível em uma
        próxima etapa do desenvolvimento (Fase 7).
      </p>
    </div>
  );
}
