"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type CameraPreviewProps = {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
  /** Chamado quando a câmera não pôde ser aberta (permissão negada, indisponível, etc.). */
  onUnavailable: (reason: string) => void;
};

export function CameraPreview({ onCapture, onCancel, onUnavailable }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (error) {
        const reason =
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Permissão da câmera negada."
            : "Não foi possível abrir a câmera neste dispositivo.";
        onUnavailable(reason);
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só deve rodar uma vez, ao montar
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, "image/jpeg", 0.92);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
          <div className="h-full w-full rounded-xl border-2 border-dashed border-white/80" />
        </div>
        {!ready ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
            Abrindo câmera...
          </div>
        ) : null}
      </div>
      <p className="text-center text-sm text-foreground/60">Enquadre apenas o visor.</p>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" className="flex-1" disabled={!ready} onClick={handleCapture}>
          Fotografar
        </Button>
      </div>
    </div>
  );
}
