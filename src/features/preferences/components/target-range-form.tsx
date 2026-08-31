"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db/schema";
import { preferencesRepository } from "@/lib/db/preferences-repository";
import {
  targetRangeSchema,
  parseOptionalRangeFieldValue,
  type TargetRangeInput,
} from "@/features/preferences/schemas";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export function TargetRangeForm() {
  const preferences = useLiveQuery(() => getDb().preferences.get("local"), []);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TargetRangeInput>({
    resolver: zodResolver(targetRangeSchema),
    defaultValues: { targetMinMgDl: undefined, targetMaxMgDl: undefined },
  });

  // Preenche o formulário assim que a preferência salva for carregada do IndexedDB.
  useEffect(() => {
    if (preferences) {
      reset({
        targetMinMgDl: preferences.targetMinMgDl,
        targetMaxMgDl: preferences.targetMaxMgDl,
      });
    }
  }, [preferences, reset]);

  async function onSubmit(data: TargetRangeInput) {
    await preferencesRepository.save(data);
    setSaved(true);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onChange={() => setSaved(false)}
      noValidate
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-foreground/70">
        Defina os limites que refletem a orientação do seu profissional de
        saúde. Essa faixa é uma preferência informativa, não uma
        recomendação médica do aplicativo.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Mínimo (mg/dL)"
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          error={errors.targetMinMgDl?.message}
          {...register("targetMinMgDl", { setValueAs: parseOptionalRangeFieldValue })}
        />
        <TextField
          label="Máximo (mg/dL)"
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          error={errors.targetMaxMgDl?.message}
          {...register("targetMaxMgDl", { setValueAs: parseOptionalRangeFieldValue })}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          Salvar faixa
        </Button>
        {saved ? (
          <span role="status" className="text-sm text-status-within">
            Faixa salva.
          </span>
        ) : null}
      </div>
    </form>
  );
}
