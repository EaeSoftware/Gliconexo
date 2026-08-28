export const MIN_MEASUREMENTS_FOR_DASHBOARD = 4;

export const MEASUREMENT_CONTEXTS = [
  "jejum",
  "cafe_da_manha",
  "almoco",
  "lanche_da_tarde",
  "jantar",
  "antes_de_dormir",
  "madrugada",
  "atividade_fisica",
  "outro",
] as const;

export type MeasurementContext = (typeof MEASUREMENT_CONTEXTS)[number];

export const MEASUREMENT_CONTEXT_LABELS: Record<MeasurementContext, string> = {
  jejum: "Jejum",
  cafe_da_manha: "Café da manhã",
  almoco: "Almoço",
  lanche_da_tarde: "Lanche da tarde",
  jantar: "Jantar",
  antes_de_dormir: "Antes de dormir",
  madrugada: "Madrugada",
  atividade_fisica: "Atividade física",
  outro: "Outro",
};

export const MEAL_RELATIONS = ["antes", "depois", "nao_informado"] as const;

export type MealRelation = (typeof MEAL_RELATIONS)[number];

export const MEAL_RELATION_LABELS: Record<MealRelation, string> = {
  antes: "Antes da refeição",
  depois: "Depois da refeição",
  nao_informado: "Não informado",
};
