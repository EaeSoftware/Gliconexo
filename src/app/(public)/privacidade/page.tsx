import type { Metadata } from "next";
import { LegalNotice } from "@/components/legal/legal-notice";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacidadePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold text-foreground">
        Política de privacidade
      </h1>
      <LegalNotice />
      <div className="flex flex-col gap-6 text-foreground/80">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Dados tratados como sensíveis
          </h2>
          <p>
            O GlicoNexo trata as medições de glicemia e demais dados de saúde
            informados pelo usuário como dados pessoais sensíveis, nos termos
            da Lei Geral de Proteção de Dados (LGPD).
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            O que fazemos com seus dados
          </h2>
          <p>
            Os dados de medição são armazenados para permitir o registro, a
            organização e a visualização do seu histórico. Não utilizamos
            esses dados para diagnóstico, prescrição ou qualquer decisão
            clínica automatizada.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Seus direitos
          </h2>
          <p>
            Você pode exportar todos os seus dados e solicitar a exclusão da
            sua conta a qualquer momento, na área de configurações do
            aplicativo.
          </p>
        </section>
      </div>
    </div>
  );
}
