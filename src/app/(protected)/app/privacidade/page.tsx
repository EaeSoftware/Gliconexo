import type { Metadata } from "next";
import Link from "next/link";
import { ExportAllDataButton } from "@/features/privacy/components/export-all-data-button";
import { DeleteAccountSection } from "@/features/privacy/components/delete-account-section";
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
          Gera um arquivo com todas as suas medições e sua faixa pessoal
          salvas neste dispositivo. Consentimentos ainda não são
          registrados (aguardando a autenticação real, ver{" "}
          <Link href="/privacidade" className="underline">
            política de privacidade
          </Link>
          ).
        </p>
        <ExportAllDataButton />
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

      <DeleteAccountSection />

      <p className="text-xs text-foreground/50">
        Revogar consentimento será habilitado quando o registro de
        consentimentos estiver conectado (ver{" "}
        <Link href="/privacidade" className="underline">
          política de privacidade
        </Link>
        ).
      </p>
    </div>
  );
}
