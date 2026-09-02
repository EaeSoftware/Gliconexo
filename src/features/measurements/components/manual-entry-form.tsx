"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { measurementSchema, type MeasurementInput } from "@/features/measurements/schemas";
import {
  MEASUREMENT_CONTEXTS,
  MEASUREMENT_CONTEXT_LABELS,
  MEAL_RELATIONS,
  MEAL_RELATION_LABELS,
} from "@/features/measurements/constants";
import { measurementRepository, type GlucoseMeasurement } from "@/lib/db/measurement-repository";
import { getDb } from "@/lib/db/schema";
import { classifyValue } from "@/features/measurements/classify";
import { ClassificationBadge } from "@/features/measurements/components/classification-badge";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

function nowForDateTimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function isoToDateTimeLocal(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

type ManualEntryFormProps = {
  origin?: "manual" | "ocr";
  defaultValue?: string;
  onSaved?: (measurement: GlucoseMeasurement) => void;
  /** Foto recortada temporária, exibida acima do formulário (fluxo de OCR). */
  previewImageUrl?: string;
  /** Nível de confiança do OCR (0–1), registrado junto da medição. */
  ocrConfidence?: number;
  ocrEngineVersion?: string;
  /** Mostra um botão "Tentar novamente" (voltar à captura), além de "Confirmar e salvar". */
  onRetry?: () => void;
  /**
   * Chamado ao clicar em "Registrar outra medição" na tela de sucesso,
   * no lugar do reset interno padrão — usado pelo fluxo de OCR para
   * voltar à captura em vez de reexibir a foto/estado antigos.
   */
  onRegisterAnother?: () => void;
} & (
  | { mode?: "create" }
  | { mode: "edit"; measurementId: string; initialValues: MeasurementInput; onCancel?: () => void }
);

export function ManualEntryForm(props: ManualEntryFormProps) {
  const {
    origin = "manual",
    defaultValue,
    onSaved,
    previewImageUrl,
    ocrConfidence,
    ocrEngineVersion,
    onRetry,
    onRegisterAnother,
  } = props;
  const isEdit = props.mode === "edit";

  const [saved, setSaved] = useState<GlucoseMeasurement | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const preferences = useLiveQuery(() => getDb().preferences.get("local"), []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MeasurementInput>({
    resolver: zodResolver(measurementSchema),
    defaultValues: isEdit
      ? {
          ...props.initialValues,
          measuredAt: isoToDateTimeLocal(props.initialValues.measuredAt),
        }
      : {
          valueMgDl: defaultValue ? Number(defaultValue) : undefined,
          measuredAt: nowForDateTimeLocal(),
          context: "outro",
          mealRelation: "nao_informado",
        },
  });

  async function onSubmit(data: MeasurementInput) {
    setSaveError(null);
    try {
      if (isEdit) {
        const updated = await measurementRepository.update(props.measurementId, data);
        onSaved?.(updated);
        return;
      }
      const measurement = await measurementRepository.create({
        ...data,
        source: origin,
        ...(origin === "ocr" ? { ocrConfidence, ocrEngineVersion } : {}),
      });
      setSaved(measurement);
      onSaved?.(measurement);
    } catch {
      setSaveError(
        "Não foi possível salvar a medição neste dispositivo. Tente novamente.",
      );
    }
  }

  if (saved) {
    const classification = classifyValue(saved.valueMgDl, preferences ?? null);
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground">Medição salva: {saved.valueMgDl} mg/dL</p>
          {classification ? <ClassificationBadge classification={classification} /> : null}
        </div>
        <p className="text-sm text-foreground/70">
          Salva neste dispositivo. A sincronização com a nuvem será
          habilitada quando a conta do banco de dados estiver configurada.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => (onRegisterAnother ? onRegisterAnother() : setSaved(null))}
            className="flex-1"
          >
            Registrar outra medição
          </Button>
          <Link
            href="/app/historico"
            className="inline-flex flex-1 min-h-11 items-center justify-center rounded-full bg-brand-navy px-6 text-sm font-semibold text-white hover:bg-brand-navy/90"
          >
            Ver histórico
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {previewImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL de blob local temporária
        <img
          src={previewImageUrl}
          alt="Foto recortada do visor do glicosímetro, para conferência"
          className="max-h-48 w-full rounded-xl border border-border object-contain"
        />
      ) : null}

      <TextField
        label="Valor (mg/dL)"
        type="number"
        inputMode="numeric"
        min={1}
        max={999}
        error={errors.valueMgDl?.message}
        {...register("valueMgDl", { valueAsNumber: true })}
      />

      <TextField
        label="Data e horário"
        type="datetime-local"
        error={errors.measuredAt?.message}
        {...register("measuredAt")}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="context" className="text-sm font-medium text-foreground">
          Contexto
        </label>
        <select
          id="context"
          className="min-h-11 rounded-lg border border-border bg-surface px-4 text-base text-foreground"
          {...register("context")}
        >
          {MEASUREMENT_CONTEXTS.map((context) => (
            <option key={context} value={context}>
              {MEASUREMENT_CONTEXT_LABELS[context]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="mealRelation" className="text-sm font-medium text-foreground">
          Relação com a refeição (opcional)
        </label>
        <select
          id="mealRelation"
          className="min-h-11 rounded-lg border border-border bg-surface px-4 text-base text-foreground"
          {...register("mealRelation")}
        >
          {MEAL_RELATIONS.map((relation) => (
            <option key={relation} value={relation}>
              {MEAL_RELATION_LABELS[relation]}
            </option>
          ))}
        </select>
      </div>

      <TextField
        label="Observação (opcional)"
        error={errors.notes?.message}
        {...register("notes")}
      />

      {!isEdit && origin === "ocr" ? (
        <div className="flex flex-col gap-1">
          <p role="alert" className="text-sm font-medium text-foreground/80">
            Confira o valor no visor antes de salvar.
          </p>
          {ocrConfidence != null ? (
            <p className="text-xs text-foreground/60">
              {ocrConfidence >= 0.7
                ? "Confiança do reconhecimento: alta."
                : "Confiança do reconhecimento: baixa — revise o valor com atenção."}
            </p>
          ) : (
            <p className="text-xs text-foreground/60">
              Nenhum valor foi reconhecido automaticamente. Digite o valor mostrado no visor.
            </p>
          )}
        </div>
      ) : null}

      {saveError ? (
        <p role="alert" className="text-sm font-medium text-status-below">
          {saveError}
        </p>
      ) : null}

      <div className="mt-2 flex gap-3">
        {isEdit && props.onCancel ? (
          <Button type="button" variant="outline" onClick={props.onCancel} className="flex-1">
            Cancelar
          </Button>
        ) : null}
        {!isEdit && onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry} className="flex-1">
            Tentar novamente
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isEdit ? "Salvar alterações" : "Confirmar e salvar"}
        </Button>
      </div>
    </form>
  );
}
