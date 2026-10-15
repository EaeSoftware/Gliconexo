import type { Metadata } from "next";
import { ExportAllDataButton } from "@/features/privacy/components/export-all-data-button";
import { DeleteAccountSection } from "@/features/privacy/components/delete-account-section";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacidadeAppPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Privacidade</h1>
        <p className="text-sm text-foreground/70">
          Suas medições de glicemia são tratadas como dados pessoais
          sensíveis. Você tem controle sobre exportação e exclusão dos seus
          dados.
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
        <h2 className="mb-2 font-semibold text-foreground">Fotos do visor</h2>
        <p className="text-sm text-foreground/70">
          Ao registrar por câmera, você pode guardar a foto do visor junto da
          medição. Ela fica somente neste aparelho, é apagada quando a
          medição é excluída (ou quando você a remove no detalhe do registro)
          e só vai para o PDF se você marcar essa opção ao exportar. O CSV e o
          arquivo com todos os dados não incluem fotos.
        </p>
      </section>

      <DeleteAccountSection />
    </div>
  );
}
