"use client";

import { useState } from "react";
import { Camera, Keyboard } from "lucide-react";
import { ManualEntryForm } from "@/features/measurements/components/manual-entry-form";
import { CameraCaptureFlow } from "@/features/ocr/components/camera-capture-flow";

export function RegisterTabs() {
  const [mode, setMode] = useState<"camera" | "manual">("manual");

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Forma de registro" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "camera"}
          onClick={() => setMode("camera")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
            mode === "camera"
              ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
              : "border-border bg-surface text-foreground/70"
          }`}
        >
          <Camera aria-hidden="true" size={18} />
          Usar câmera
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "manual"}
          onClick={() => setMode("manual")}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
            mode === "manual"
              ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
              : "border-border bg-surface text-foreground/70"
          }`}
        >
          <Keyboard aria-hidden="true" size={18} />
          Digitar valor
        </button>
      </div>

      {mode === "camera" ? (
        <div role="tabpanel">
          <CameraCaptureFlow />
        </div>
      ) : (
        <div role="tabpanel">
          <ManualEntryForm origin="manual" />
        </div>
      )}
    </div>
  );
}
