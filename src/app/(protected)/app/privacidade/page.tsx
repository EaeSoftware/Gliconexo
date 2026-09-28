import type { Metadata } from "next";
import { ExportAllDataButton } from "@/features/privacy/components/export-all-data-button";
import { RevokeConsentButton } from "@/features/privacy/components/revoke-consent-button";
import { DeleteAccountButton } from "@/features/privacy/components/delete-account-button";

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
          Gera um arquivo com todas as suas medições e sua faixa pessoal
          salvas neste dispositivo.
        </p>
        <ExportAllDataButton />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-2 font-semibold text-foreground">Revogar consentimento</h2>
        <p className="mb-3 text-sm text-foreground/70">
          Você pode revogar o consentimento para tratamento de dados de
          saúde a qualquer momento.
        </p>
        <RevokeConsentButton />
      </section>

      <section className="rounded-2xl border border-status-below/40 bg-status-below/5 p-5">
        <h2 className="mb-2 font-semibold text-foreground">Excluir conta e dados</h2>
        <p className="mb-3 text-sm text-foreground/70">
          Remove permanentemente sua conta e os dados vinculados, conforme a
          política de retenção documentada.
        </p>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
