import { z } from "zod";
import { MEASUREMENT_CONTEXTS, MEAL_RELATIONS } from "@/features/measurements/constants";

export const measurementSchema = z.object({
  valueMgDl: z
    .number({ error: "Informe um valor numérico." })
    .int("O valor deve ser um número inteiro.")
    .min(1, "O valor deve estar entre 1 e 999 mg/dL.")
    .max(999, "O valor deve estar entre 1 e 999 mg/dL."),
  measuredAt: z.string().min(1, "Informe a data e o horário."),
  context: z.enum(MEASUREMENT_CONTEXTS, { error: "Selecione um contexto." }),
  mealRelation: z.enum(MEAL_RELATIONS),
  notes: z.string().max(1000, "A observação deve ter no máximo 1000 caracteres.").optional(),
});

export type MeasurementInput = z.infer<typeof measurementSchema>;
