import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { InstallPwaButton } from "@/components/pwa/install-button";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Configurações" };

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      <SettingsSection title="Aparência">
        <ThemeToggle />
      </SettingsSection>

      <SettingsSection title="Instalar aplicativo">
        <InstallPwaButton />
      </SettingsSection>

      <SettingsSection title="Faixa pessoal de glicemia">
        <p className="text-sm text-foreground/70">
          Defina os limites que refletem a orientação do seu profissional de
          saúde. Essa faixa é uma preferência informativa, não uma
          recomendação médica do aplicativo.
        </p>
        <p className="mt-3 text-sm font-medium text-foreground/50">
          Disponível em uma próxima etapa do desenvolvimento.
        </p>
      </SettingsSection>

      <SettingsSection title="Sincronização">
        <p className="text-sm text-foreground/70">
          Assim que a conta e o armazenamento local estiverem conectados,
          você verá aqui o status da sincronização e poderá sincronizar
          manualmente.
        </p>
      </SettingsSection>

      <SettingsSection title="Privacidade e dados">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" disabled>
            Exportar todos os dados
          </Button>
          <Button type="button" variant="outline" disabled>
            Excluir conta e dados
          </Button>
        </div>
        <p className="mt-3 text-sm text-foreground/70">
          <Link href="/app/privacidade" className="font-medium text-brand-blue hover:underline">
            Ver central de privacidade
          </Link>
        </p>
      </SettingsSection>

      <SettingsSection title="Sobre">
        <div className="flex flex-col gap-1 text-sm text-foreground/70">
          <p>Versão do aplicativo: 0.1.0 (desenvolvimento)</p>
          <Link href="/privacidade" className="text-brand-blue hover:underline">
            Política de privacidade
          </Link>
          <Link href="/termos" className="text-brand-blue hover:underline">
            Termos de uso
          </Link>
        </div>
      </SettingsSection>
    </div>
  );
}
