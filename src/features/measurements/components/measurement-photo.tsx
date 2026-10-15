"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ocrImageRepository } from "@/lib/db/ocr-image-repository";
import { blobToDataUrl } from "@/lib/export/blob-to-data-url";
import { Button } from "@/components/ui/button";

/**
 * Foto do visor guardada junto da medição (só neste aparelho). Não mostra
 * nada quando a medição não tem foto. O usuário pode removê-la a qualquer
 * momento sem excluir a medição.
 */
export function MeasurementPhoto({ measurementId }: { measurementId: string }) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [loaded, setLoaded] = useState<{ blob: Blob; url: string } | null>(null);

  const image = useLiveQuery(
    async () => (await ocrImageRepository.get(measurementId)) ?? null,
    [measurementId],
  );

  // Data URL em vez de object URL: não há nada para revogar e o estado só é
  // atualizado no callback da leitura, nunca de forma síncrona no efeito.
  useEffect(() => {
    if (!image) return;
    let cancelled = false;
    blobToDataUrl(image.blob)
      .then((url) => {
        if (!cancelled) setLoaded({ blob: image.blob, url });
      })
      .catch(() => {
        if (!cancelled) setLoaded(null);
      });
    return () => {
      cancelled = true;
    };
  }, [image]);

  // Só mostra a foto que corresponde ao registro atual (evita exibir a anterior após remoção).
  const src = image && loaded?.blob === image.blob ? loaded.url : null;
  if (!src) return null;

  return (
    <section
      aria-labelledby="measurement-photo-heading"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="measurement-photo-heading" className="mb-2 text-sm font-semibold text-foreground">
        Foto do visor
      </h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL local */}
      <img
        src={src}
        alt="Foto do visor do glicosímetro guardada com esta medição"
        className="max-h-56 w-full rounded-xl border border-border object-contain"
      />
      <p className="mt-2 text-xs text-foreground/60">
        Guardada somente neste aparelho. Não vai para a nuvem e só entra no PDF se você marcar essa opção.
      </p>
      <div className="mt-3 flex gap-3">
        {confirmingRemove ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmingRemove(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1 bg-status-below hover:bg-status-below/90"
              onClick={async () => {
                await ocrImageRepository.remove(measurementId);
                setConfirmingRemove(false);
              }}
            >
              Confirmar remoção
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => setConfirmingRemove(true)}
          >
            Remover foto
          </Button>
        )}
      </div>
    </section>
  );
}
