import type { Metadata } from "next";
import { LegalNotice } from "@/components/legal/legal-notice";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold text-foreground">Termos de uso</h1>
      <LegalNotice />
      <div className="flex flex-col gap-6 text-foreground/80">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Natureza do serviço
          </h2>
          <p>
            O GlicoNexo é uma ferramenta de registro, organização e
            visualização de medições de glicemia capilar. Ele não realiza
            diagnóstico, não prescreve tratamento, não calcula dose de
            insulina e não substitui a avaliação de um profissional de saúde.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Responsabilidade do usuário
          </h2>
          <p>
            As decisões sobre tratamento e cuidados de saúde devem ser sempre
            tomadas em conjunto com um profissional de saúde qualificado.
          </p>
        </section>
      </div>
    </div>
  );
}
