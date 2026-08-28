"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { measurementSchema, type MeasurementInput } from "@/features/measurements/schemas";
import {
  MEASUREMENT_CONTEXTS,
  MEASUREMENT_CONTEXT_LABELS,
  MEAL_RELATIONS,
  MEAL_RELATION_LABELS,
} from "@/features/measurements/constants";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

function nowForDateTimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

type ManualEntryFormProps = {
  origin?: "manual" | "ocr";
  defaultValue?: string;
};

export function ManualEntryForm({ origin = "manual", defaultValue }: ManualEntryFormProps) {
  const [confirmed, setConfirmed] = useState<MeasurementInput | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MeasurementInput>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      valueMgDl: defaultValue ? Number(defaultValue) : undefined,
      measuredAt: nowForDateTimeLocal(),
      context: "outro",
      mealRelation: "nao_informado",
    },
  });

  async function onSubmit(data: MeasurementInput) {
    // TODO (Fase 3): persistir no repositório local (IndexedDB) e enfileirar sincronização com o Supabase.
    setConfirmed(data);
  }

  if (confirmed) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <p className="font-semibold text-foreground">Valor confirmado: {confirmed.valueMgDl} mg/dL</p>
        <p className="text-sm text-foreground/70">
          O armazenamento local e a sincronização automática serão
          habilitados em uma próxima etapa do desenvolvimento. Por enquanto,
          esta tela demonstra apenas o fluxo de confirmação.
        </p>
        <Button type="button" variant="outline" onClick={() => setConfirmed(null)}>
          Registrar outra medição
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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

      {origin === "ocr" ? (
        <p role="alert" className="text-sm font-medium text-foreground/80">
          Confira o valor no visor antes de salvar.
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        Confirmar e salvar
      </Button>
    </form>
  );
}
