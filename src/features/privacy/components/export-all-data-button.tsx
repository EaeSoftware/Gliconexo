"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { buildAllDataExport } from "@/features/privacy/export-all-data";
import { shareOrDownloadFile, canShareFiles } from "@/lib/export/download-file";
import { Button } from "@/components/ui/button";

export function ExportAllDataButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const measurements = useLiveQuery(() => getDb().measurements.toArray(), []);
  const preferences = useLiveQuery(() => getDb().preferences.get("local"), []);

  async function handleExport() {
    setIsExporting(true);
    setStatus(null);
    try {
      const data = buildAllDataExport(measurements ?? [], preferences ?? null);
      const today = new Intl.DateTimeFormat("sv-SE").format(new Date());
      const result = await shareOrDownloadFile(
        {
          content: JSON.stringify(data, null, 2),
          filename: `gliconexo-meus-dados-${today}.json`,
          mimeType: "application/json",
        },
        { title: "Meus dados GlicoNexo" },
      );

      if (result === "shared") setStatus("Arquivo compartilhado.");
      else if (result === "downloaded") setStatus("Arquivo baixado.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={isExporting || measurements === undefined}
        onClick={handleExport}
      >
        {canShareFiles() ? "Compartilhar todos os dados" : "Exportar todos os dados"}
      </Button>
      {status ? (
        <p role="status" className="text-sm text-status-within">
          {status}
        </p>
      ) : null}
    </div>
  );
}
