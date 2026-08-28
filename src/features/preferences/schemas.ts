import { z } from "zod";

const optionalRangeValue = z
  .number({ error: "Informe um número inteiro." })
  .int("O valor deve ser um número inteiro.")
  .min(1, "O valor deve estar entre 1 e 999 mg/dL.")
  .max(999, "O valor deve estar entre 1 e 999 mg/dL.")
  .optional();

export const targetRangeSchema = z
  .object({
    targetMinMgDl: optionalRangeValue,
    targetMaxMgDl: optionalRangeValue,
  })
  .refine((data) => (data.targetMinMgDl == null) === (data.targetMaxMgDl == null), {
    message: "Informe os dois valores da faixa, ou deixe ambos em branco.",
    path: ["targetMaxMgDl"],
  })
  .refine(
    (data) =>
      data.targetMinMgDl == null ||
      data.targetMaxMgDl == null ||
      data.targetMinMgDl < data.targetMaxMgDl,
    {
      message: "O valor mínimo deve ser menor que o valor máximo.",
      path: ["targetMaxMgDl"],
    },
  );

export type TargetRangeInput = z.infer<typeof targetRangeSchema>;

/** Converte o valor bruto de um `<input type="number">` para `number | undefined`. */
export function parseOptionalRangeFieldValue(raw: string): number | undefined {
  if (raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}
