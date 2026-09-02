"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { filterMeasurements, type PeriodFilter } from "@/features/measurements/filter-measurements";
import { PeriodSelect } from "@/features/measurements/components/period-select";
import { buildMeasurementsCsv } from "@/features/reports/csv";
import { buildMeasurementsPdf } from "@/features/reports/pdf";
import { captureChartImage } from "@/features/reports/capture-chart-image";
import { periodFilenamePart } from "@/features/reports/filename";
import { computeMeasurementStats, computeRangeDistribution } from "@/features/measurements/stats";
import { formatMeasurementCount } from "@/features/measurements/pluralize";
import { shareOrDownloadFile } from "@/lib/export/download-file";
import { useCanShareFiles } from "@/lib/export/use-can-share-files";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { EmptyState } from "@/components/feedback/empty-state";
import { FileText } from "lucide-react";

export function ExportPanel() {
  const [period, setPeriod] = useState<PeriodFilter>(30);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [identification, setIdentification] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const canShare = useCanShareFiles();

  const measurements = useLiveQuery(
    () => getDb().measurements.filter((m) => !m.deletedAt).toArray(),
    [],
  );
  const preferences = useLiveQuery(() => getDb().preferences.get("local"), []);

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

  async function handleExportPdf() {
    setIsExporting(true);
    setStatus(null);
    try {
      const targetRange = preferences ?? null;
      const chartImageDataUrl = await captureChartImage(filtered, targetRange);
      const pdfBlob = await buildMeasurementsPdf(
        filtered,
        {
          stats: computeMeasurementStats(filtered),
          distribution: computeRangeDistribution(filtered, targetRange),
        },
        {
          includeNotes,
          identification: identification.trim() || undefined,
          period,
          targetRange,
          chartImageDataUrl,
        },
      );
      const today = new Intl.DateTimeFormat("sv-SE").format(new Date());
      const result = await shareOrDownloadFile(
        {
          content: pdfBlob,
          filename: `gliconexo-relatorio-${periodFilenamePart(period)}-${today}.pdf`,
          mimeType: "application/pdf",
        },
        { title: "Relatório GlicoNexo" },
      );

      if (result === "shared") setStatus("Arquivo compartilhado.");
      else if (result === "downloaded") setStatus("Arquivo PDF baixado.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <PeriodSelect value={period} onChange={setPeriod} />

        <div className="mt-3">
          <TextField
            label="Identificação (opcional)"
            hint="Aparece no cabeçalho do PDF. Não é salva — vale só para este relatório."
            value={identification}
            onChange={(event) => setIdentification(event.target.value)}
          />
        </div>

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
            {canShare ? "Compartilhar CSV" : "Baixar CSV"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isExporting || filtered.length === 0}
            onClick={handleExportPdf}
          >
            {canShare ? "Compartilhar PDF" : "Baixar PDF"}
          </Button>
        </div>

        {status ? (
          <p role="status" className="mt-3 text-sm text-status-within">
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}
