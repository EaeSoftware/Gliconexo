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
            Fotos do visor do glicosímetro
          </h2>
          <p>
            A foto é processada no seu aparelho e não é enviada a nenhum
            servidor. Ao registrar por câmera, você escolhe se quer guardar a
            foto do visor junto da medição (a opção vem marcada e pode ser
            desmarcada). Quando guardada, a foto fica somente neste aparelho, é
            apagada quando a medição é excluída ou quando você a remove no
            detalhe do registro, e só entra no PDF se você marcar essa opção ao
            exportar. O CSV e o arquivo com todos os dados não incluem fotos.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Seus direitos
          </h2>
          <p>
            Você pode exportar seus dados e excluir sua conta a qualquer
            momento, na área de configurações e na central de privacidade do
            aplicativo. A exclusão da conta remove suas medições, preferências
            e registros de consentimento, e é a forma de encerrar o tratamento
            dos seus dados. Ao sair da conta, os dados guardados neste aparelho
            são apagados dele.
          </p>
        </section>
      </div>
    </div>
  );
}
