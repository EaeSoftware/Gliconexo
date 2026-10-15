"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { filterMeasurements, type PeriodFilter } from "@/features/measurements/filter-measurements";
import { PeriodSelect } from "@/features/measurements/components/period-select";
import { buildMeasurementsCsv } from "@/features/reports/csv";
import { buildMeasurementsPdf, buildPdfPhotoEntries, MAX_PDF_PHOTOS } from "@/features/reports/pdf";
import { captureChartImage, captureHourlyChartImage } from "@/features/reports/capture-chart-image";
import { blobToDataUrl } from "@/lib/export/blob-to-data-url";
import { ocrImageRepository } from "@/lib/db/ocr-image-repository";
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
  // Ligada por padrão, mas só aparece quando há fotos no período (o usuário pediu a exportação).
  const [includePhotos, setIncludePhotos] = useState(true);
  const [identification, setIdentification] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const canShare = useCanShareFiles();

  const measurements = useLiveQuery(
    () => getDb().measurements.filter((m) => !m.deletedAt).toArray(),
    [],
  );
  const preferences = useLiveQuery(() => getDb().preferences.get("local"), []);
  // Só as chaves (ids das medições com foto): não carrega os blobs apenas para saber se existem.
  const photoIds = useLiveQuery(
    async () => new Set((await getDb().ocrImages.toCollection().primaryKeys()) as string[]),
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

  const filteredWithPhoto = filtered.filter((m) => photoIds?.has(m.id));

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
      const hourlyChartImageDataUrl = await captureHourlyChartImage(filtered, targetRange);

      let photos: Awaited<ReturnType<typeof buildPdfPhotoEntries>>["photos"] = [];
      let omittedPhotos = 0;
      if (includePhotos && filteredWithPhoto.length > 0) {
        // Carrega só as fotos que cabem no PDF (as mais antigas do período, como na tabela).
        const chronological = [...filteredWithPhoto].sort(
          (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime(),
        );
        const images = await ocrImageRepository.listForMeasurements(
          chronological.slice(0, MAX_PDF_PHOTOS).map((m) => m.id),
        );
        const dataUrls = new Map<string, string>();
        for (const [id, image] of images) dataUrls.set(id, await blobToDataUrl(image.blob));
        const entries = buildPdfPhotoEntries(filteredWithPhoto, dataUrls);
        photos = entries.photos;
        omittedPhotos = filteredWithPhoto.length - photos.length;
      }

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
          hourlyChartImageDataUrl,
          photos,
          omittedPhotos,
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

        {filteredWithPhoto.length > 0 ? (
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground/80">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={includePhotos}
              onChange={(event) => setIncludePhotos(event.target.checked)}
            />
            Incluir no PDF as fotos do visor ({filteredWithPhoto.length} no período)
          </label>
        ) : null}

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
