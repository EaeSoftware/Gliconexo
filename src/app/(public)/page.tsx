import { Camera, WifiOff, LineChart, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Camera,
    title: "Câmera + OCR",
    description:
      "Fotografe o visor do glicosímetro e confirme o valor reconhecido antes de salvar. O registro manual está sempre disponível.",
  },
  {
    icon: WifiOff,
    title: "Funciona offline",
    description:
      "Registre medições mesmo sem internet. A sincronização acontece automaticamente quando a conexão voltar.",
  },
  {
    icon: LineChart,
    title: "Histórico e relatórios",
    description:
      "Acompanhe gráficos a partir da quarta medição confirmada e exporte seus dados em PDF ou CSV para compartilhar com seu médico.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section
        className="relative overflow-hidden border-b border-border"
        style={{ backgroundImage: "var(--hero-mesh)" }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-brand-navy shadow-sm">
            <ShieldCheck aria-hidden="true" size={14} className="text-brand-teal" />
            Registro local, sem envio de fotos a servidores
          </span>

          <h1 className="max-w-2xl text-balance font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Sua glicemia, <span className="text-brand-blue">organizada</span> em um só lugar
          </h1>

          <p className="max-w-xl text-lg text-foreground/70">
            O GlicoNexo ajuda pessoas com Diabetes Mellitus Tipo 1 a fotografar o
            visor do glicosímetro, revisar o valor e manter um histórico
            organizado — mesmo sem internet.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/cadastro" variant="primary" className="min-w-48">
              Criar conta
            </ButtonLink>
            <ButtonLink href="/entrar" variant="outline" className="min-w-48">
              Entrar
            </ButtonLink>
          </div>

          <div
            role="note"
            className="max-w-2xl rounded-2xl border border-border bg-surface/80 px-5 py-4 text-sm text-foreground/70 backdrop-blur-sm"
          >
            O GlicoNexo é uma ferramenta de registro, organização e visualização
            de dados. Ele não diagnostica, não prescreve tratamento e não
            substitui o acompanhamento com um profissional de saúde.
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Tudo que você precisa para acompanhar sua glicemia
          </h2>
        </div>

        <dl className="grid w-full gap-6 text-left sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <Icon aria-hidden="true" size={22} />
              </span>
              <dt className="font-display font-semibold text-foreground">{title}</dt>
              <dd className="mt-2 text-sm text-foreground/70">{description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
