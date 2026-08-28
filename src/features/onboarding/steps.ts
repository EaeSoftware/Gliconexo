export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "objetivo",
    title: "Bem-vindo ao GlicoNexo",
    description:
      "O GlicoNexo ajuda você a registrar, organizar e visualizar suas medições de glicemia capilar ao longo do tempo.",
  },
  {
    id: "camera",
    title: "Fotografe o visor do glicosímetro",
    description:
      "Aponte a câmera para o visor, alinhe o número na moldura e confirme o valor antes de salvar. Se preferir, digite o valor manualmente a qualquer momento.",
  },
  {
    id: "historico",
    title: "Histórico, modo offline e relatórios",
    description:
      "Suas medições ficam disponíveis mesmo sem internet. Gráficos e indicadores aparecem a partir da quarta medição confirmada, e você pode exportar tudo em PDF ou CSV.",
  },
  {
    id: "privacidade",
    title: "Privacidade e limites do produto",
    description:
      "O GlicoNexo não diagnostica nem prescreve tratamento. Seus dados de saúde são tratados como sensíveis, e você pode exportá-los ou excluí-los quando quiser.",
  },
];
