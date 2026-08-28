import { ButtonLink } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-4 py-16 text-center sm:px-6">
      <div className="flex flex-col items-center gap-4">
        <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Organize suas medições de glicemia em um só lugar
        </h1>
        <p className="max-w-xl text-lg text-foreground/70">
          O GlicoNexo ajuda pessoas com Diabetes Mellitus Tipo 1 a fotografar o
          visor do glicosímetro, revisar o valor e manter um histórico
          organizado — mesmo sem internet.
        </p>
      </div>

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
        className="max-w-2xl rounded-xl border border-border bg-surface-muted px-5 py-4 text-sm text-foreground/70"
      >
        O GlicoNexo é uma ferramenta de registro, organização e visualização
        de dados. Ele não diagnostica, não prescreve tratamento e não
        substitui o acompanhamento com um profissional de saúde.
      </div>

      <dl className="grid w-full gap-6 text-left sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5">
          <dt className="font-semibold text-foreground">Câmera + OCR</dt>
          <dd className="mt-1 text-sm text-foreground/70">
            Fotografe o visor do glicosímetro e confirme o valor reconhecido
            antes de salvar. O registro manual está sempre disponível.
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <dt className="font-semibold text-foreground">Funciona offline</dt>
          <dd className="mt-1 text-sm text-foreground/70">
            Registre medições mesmo sem internet. A sincronização acontece
            automaticamente quando a conexão voltar.
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <dt className="font-semibold text-foreground">Histórico e relatórios</dt>
          <dd className="mt-1 text-sm text-foreground/70">
            Acompanhe gráficos a partir da quarta medição confirmada e exporte
            seus dados em PDF ou CSV para compartilhar com seu médico.
          </dd>
        </div>
      </dl>
    </div>
  );
}
