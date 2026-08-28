import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacidadeAppPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Privacidade</h1>
        <p className="text-sm text-foreground/70">
          Suas medições de glicemia são tratadas como dados pessoais
          sensíveis. Você tem controle sobre exportação, revogação de
          consentimento e exclusão.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-2 font-semibold text-foreground">Exportar meus dados</h2>
        <p className="mb-3 text-sm text-foreground/70">
          Gera um arquivo com todas as suas medições, preferências e
          consentimentos registrados.
        </p>
        <Button type="button" variant="outline" disabled>
          Exportar todos os dados
        </Button>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-2 font-semibold text-foreground">Revogar consentimento</h2>
        <p className="mb-3 text-sm text-foreground/70">
          Você pode revogar o consentimento para tratamento de dados de
          saúde a qualquer momento.
        </p>
        <Button type="button" variant="outline" disabled>
          Revogar consentimento
        </Button>
      </section>

      <section className="rounded-2xl border border-status-below/40 bg-status-below/5 p-5">
        <h2 className="mb-2 font-semibold text-foreground">Excluir conta e dados</h2>
        <p className="mb-3 text-sm text-foreground/70">
          Remove permanentemente sua conta e os dados vinculados, conforme a
          política de retenção documentada.
        </p>
        <Button type="button" variant="outline" disabled>
          Excluir conta
        </Button>
      </section>

      <p className="text-xs text-foreground/50">
        As ações desta página serão habilitadas quando a autenticação e a
        função de exclusão de conta forem implementadas (ver{" "}
        <Link href="/privacidade" className="underline">
          política de privacidade
        </Link>
        ).
      </p>
    </div>
  );
}
