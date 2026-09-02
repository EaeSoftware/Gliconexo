"use client";

import { useEffect, useRef, useState } from "react";
import { CameraPreview } from "@/features/ocr/components/camera-preview";
import { FilePickerButton } from "@/features/ocr/components/file-picker-button";
import { ImageEditor } from "@/features/ocr/components/image-editor";
import type { OcrProgress } from "@/features/ocr/tesseract-provider";
import { SevenSegmentOcrProvider } from "@/features/ocr/seven-segment/seven-segment-provider";
import type { OpenCvProgress } from "@/features/ocr/seven-segment/opencv-loader";
import type { OcrResult } from "@/features/ocr/types";
import { ManualEntryForm } from "@/features/measurements/components/manual-entry-form";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

type Step = "idle" | "camera" | "unavailable" | "edit" | "processing" | "confirm";

const hasGetUserMedia =
  typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

type CameraCaptureFlowProps = {
  onSaved?: (measurement: GlucoseMeasurement) => void;
};

export function CameraCaptureFlow({ onSaved }: CameraCaptureFlowProps) {
  const [step, setStep] = useState<Step>("idle");
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrProgressText, setOcrProgressText] = useState<string>("Preparando...");

  const providerRef = useRef<SevenSegmentOcrProvider | null>(null);

  function getProvider() {
    if (!providerRef.current) {
      providerRef.current = new SevenSegmentOcrProvider({
        onProgress: (progress: OpenCvProgress | OcrProgress) => {
          setOcrProgressText(describeProgress(progress));
        },
      });
    }
    return providerRef.current;
  }

  useEffect(
    () => () => {
      // Libera o worker de OCR ao sair da tela de registro.
      providerRef.current?.terminate();
    },
    [],
  );

  function resetToIdle() {
    if (rawImageUrl) URL.revokeObjectURL(rawImageUrl);
    if (croppedImageUrl) URL.revokeObjectURL(croppedImageUrl);
    setRawImageUrl(null);
    setCroppedImageUrl(null);
    setOcrResult(null);
    setUnavailableReason(null);
    setStep("idle");
  }

  function handleFileSelected(file: File) {
    setRawImageUrl(URL.createObjectURL(file));
    setStep("edit");
  }

  function handleCameraCapture(blob: Blob) {
    setRawImageUrl(URL.createObjectURL(blob));
    setStep("edit");
  }

  function handleCameraUnavailable(reason: string) {
    if (rawImageUrl) URL.revokeObjectURL(rawImageUrl);
    setRawImageUrl(null);
    setUnavailableReason(reason);
    setStep("unavailable");
  }

  async function handleCropConfirmed(croppedBlob: Blob) {
    if (rawImageUrl) URL.revokeObjectURL(rawImageUrl);
    setRawImageUrl(null);
    setCroppedImageUrl(URL.createObjectURL(croppedBlob));
    setStep("processing");
    setOcrProgressText("Preparando reconhecimento...");

    try {
      // Chama o provider diretamente: SevenSegmentOcrProvider já faz seu
      // próprio loop de níveis de limiar internamente, depois de detectar
      // e recortar o visor — não precisa do loop genérico de
      // `runOcrPipeline` (que continua existindo, usado pelo
      // TesseractOcrProvider legado e por seus próprios testes).
      const result = await getProvider().recognize(croppedBlob);
      setOcrResult(result);
    } catch {
      setOcrResult({ value: null, confidence: 0, candidates: [], engineVersion: "" });
    } finally {
      setStep("confirm");
    }
  }

  function handleEditCancel() {
    resetToIdle();
  }

  function handleRetry() {
    if (croppedImageUrl) URL.revokeObjectURL(croppedImageUrl);
    setCroppedImageUrl(null);
    setOcrResult(null);
    setStep("idle");
  }

  function handleSaved(measurement: GlucoseMeasurement) {
    onSaved?.(measurement);
    // Descarta a foto temporária imediatamente após salvar — nunca é
    // persistida. `step` continua "confirm": a própria tela de
    // confirmação já troca para o estado "Medição salva" internamente.
    if (croppedImageUrl) URL.revokeObjectURL(croppedImageUrl);
    setCroppedImageUrl(null);
  }

  if (step === "idle") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface-muted p-8 text-center">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue"
        >
          <Camera size={26} strokeWidth={1.75} />
        </span>
        <p className="text-sm text-foreground/70">
          Fotografe o visor do glicosímetro ou escolha uma imagem já
          existente. A foto não é enviada para nenhum servidor — o
          reconhecimento acontece neste dispositivo.
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          {hasGetUserMedia ? (
            <Button type="button" className="flex-1" onClick={() => setStep("camera")}>
              Fotografar
            </Button>
          ) : (
            <FilePickerButton
              label="Fotografar"
              capture="environment"
              variant="primary"
              className="flex-1"
              onSelect={handleFileSelected}
            />
          )}
          <FilePickerButton
            label="Selecionar imagem"
            variant="outline"
            className="flex-1"
            onSelect={handleFileSelected}
          />
        </div>
      </div>
    );
  }

  if (step === "camera") {
    return (
      <CameraPreview
        onCapture={handleCameraCapture}
        onCancel={resetToIdle}
        onUnavailable={handleCameraUnavailable}
      />
    );
  }

  if (step === "unavailable") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface-muted p-8 text-center">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-status-below/10 text-status-below"
        >
          <CameraOff size={26} strokeWidth={1.75} />
        </span>
        <p className="text-sm text-foreground/70">
          {unavailableReason} Você ainda pode fotografar ou escolher uma
          imagem pelo seletor do sistema, ou digitar o valor manualmente
          na outra aba.
        </p>
        <FilePickerButton
          label="Fotografar ou selecionar imagem"
          capture="environment"
          variant="primary"
          onSelect={handleFileSelected}
        />
      </div>
    );
  }

  if (step === "edit" && rawImageUrl) {
    return <ImageEditor imageUrl={rawImageUrl} onConfirm={handleCropConfirmed} onCancel={handleEditCancel} />;
  }

  if (step === "processing") {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center">
        {croppedImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL de blob local temporária
          <img src={croppedImageUrl} alt="" className="max-h-40 rounded-lg border border-border object-contain" />
        ) : null}
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
        <p className="text-sm text-foreground/70">{ocrProgressText}</p>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <ManualEntryForm
        origin="ocr"
        previewImageUrl={croppedImageUrl ?? undefined}
        defaultValue={ocrResult?.value != null ? String(ocrResult.value) : undefined}
        ocrConfidence={ocrResult?.confidence}
        ocrEngineVersion={ocrResult?.engineVersion}
        onRetry={handleRetry}
        onSaved={handleSaved}
        onRegisterAnother={resetToIdle}
      />
    );
  }

  return null;
}

function describeProgress(progress: OpenCvProgress | OcrProgress): string {
  if (progress.status === "loading") return "Carregando mecanismo de leitura...";
  if (progress.status === "ready") return "Preparando reconhecimento...";

  const percent = Math.round(progress.progress * 100);
  switch (progress.status) {
    case "loading tesseract core":
      return `Carregando mecanismo de OCR alternativo... ${percent}%`;
    case "initializing tesseract":
      return "Inicializando OCR alternativo...";
    case "loading language traineddata":
      return `Baixando modelo de reconhecimento alternativo... ${percent}%`;
    case "initializing api":
      return "Preparando reconhecimento...";
    case "recognizing text":
      return `Reconhecendo o valor... ${percent}%`;
    default:
      return "Processando...";
  }
}
