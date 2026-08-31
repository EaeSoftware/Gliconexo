"use client";

import { useRef, useState } from "react";
import { rotateImageUrl, cropImageUrl, type CropRectPercent } from "@/features/ocr/canvas-utils";
import { CropRectOverlay } from "@/features/ocr/components/crop-rect-overlay";
import { Button } from "@/components/ui/button";

const DEFAULT_RECT: CropRectPercent = { x: 15, y: 30, width: 70, height: 40 };

type ImageEditorProps = {
  imageUrl: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
};

export function ImageEditor({ imageUrl, onConfirm, onCancel }: ImageEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentUrl, setCurrentUrl] = useState(imageUrl);
  const [rect, setRect] = useState<CropRectPercent>(DEFAULT_RECT);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousUrls = useRef<string[]>([]);

  async function handleRotate(degrees: 90 | -90) {
    setIsBusy(true);
    setError(null);
    try {
      const rotatedBlob = await rotateImageUrl(currentUrl, degrees);
      const rotatedUrl = URL.createObjectURL(rotatedBlob);
      previousUrls.current.push(currentUrl);
      setCurrentUrl(rotatedUrl);
      setRect(DEFAULT_RECT);
    } catch {
      setError("Não foi possível girar a imagem. Tente novamente.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirm() {
    setIsBusy(true);
    setError(null);
    try {
      const croppedBlob = await cropImageUrl(currentUrl, rect);
      previousUrls.current.forEach((url) => URL.revokeObjectURL(url));
      onConfirm(croppedBlob);
    } catch {
      setError("Não foi possível recortar a imagem. Tente novamente.");
      setIsBusy(false);
    }
  }

  function handleCancel() {
    previousUrls.current.forEach((url) => URL.revokeObjectURL(url));
    onCancel();
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={containerRef} className="relative select-none overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL de blob local, otimização de next/image não se aplica */}
        <img src={currentUrl} alt="" className="block w-full touch-none" draggable={false} />
        <CropRectOverlay containerRef={containerRef} rect={rect} onChange={setRect} />
      </div>

      <p className="text-center text-sm text-foreground/60">
        Gire se necessário e ajuste o retângulo para cobrir apenas o
        visor do glicosímetro.
      </p>

      <div className="flex justify-center gap-3">
        <Button type="button" variant="outline" disabled={isBusy} onClick={() => handleRotate(-90)}>
          ↺ Girar
        </Button>
        <Button type="button" variant="outline" disabled={isBusy} onClick={() => handleRotate(90)}>
          ↻ Girar
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-center text-sm font-medium text-status-below">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" disabled={isBusy} onClick={handleCancel}>
          Cancelar
        </Button>
        <Button type="button" className="flex-1" disabled={isBusy} onClick={handleConfirm}>
          Usar esta área
        </Button>
      </div>
    </div>
  );
}
