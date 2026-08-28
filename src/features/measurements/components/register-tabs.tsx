"use client";

import { useState } from "react";
import { ManualEntryForm } from "@/features/measurements/components/manual-entry-form";

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
          className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors ${
            mode === "camera"
              ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
              : "border-border bg-surface text-foreground/70"
          }`}
        >
          📷 Usar câmera
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "manual"}
          onClick={() => setMode("manual")}
          className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors ${
            mode === "manual"
              ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
              : "border-border bg-surface text-foreground/70"
          }`}
        >
          ⌨️ Digitar valor
        </button>
      </div>

      {mode === "camera" ? (
        <div
          role="tabpanel"
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface-muted p-8 text-center"
        >
          <span aria-hidden="true" className="text-3xl">
            📷
          </span>
          <p className="font-medium text-foreground">
            Captura por câmera com OCR chega em breve
          </p>
          <p className="text-sm text-foreground/70">
            Por enquanto, use a opção &ldquo;Digitar valor&rdquo; para
            registrar sua medição manualmente. Uma falha na leitura por
            câmera nunca impedirá o registro manual.
          </p>
        </div>
      ) : (
        <div role="tabpanel">
          <ManualEntryForm origin="manual" />
        </div>
      )}
    </div>
  );
}
