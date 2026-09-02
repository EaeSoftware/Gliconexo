import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Info, RefreshCw, Shield, Sparkles, Target, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { InstallPwaButton } from "@/components/pwa/install-button";
import { TargetRangeForm } from "@/features/preferences/components/target-range-form";
import { ExportAllDataButton } from "@/features/privacy/components/export-all-data-button";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import {
  SettingsDisclosureRow,
  SettingsGroup,
  SettingsLinkRow,
  SettingsStaticRow,
} from "@/components/ui/settings-row";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue to-brand-teal p-6 text-white shadow-md">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-bold">Leve seus dados à consulta</p>
            <p className="mt-1 max-w-[240px] text-sm text-white/85">
              Gere um relatório em PDF ou CSV e compartilhe com seu
              profissional de saúde.
            </p>
            <Link
              href="/app/relatorios"
              className="mt-4 inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-brand-navy transition-colors hover:bg-white/90"
            >
              Ver relatórios
            </Link>
          </div>
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15"
          >
            <Sparkles size={30} />
          </span>
        </div>
      </div>

      <SettingsGroup title="Preferências">
        <ThemeToggle />
        <InstallPwaButton />
      </SettingsGroup>

      <SettingsGroup title="Dados">
        <SettingsDisclosureRow
          icon={Target}
          label="Faixa pessoal de glicemia"
          description="Usada para classificar suas medições"
        >
          <TargetRangeForm />
        </SettingsDisclosureRow>
        <SettingsStaticRow
          icon={RefreshCw}
          label="Sincronização"
          description="Em breve: status e sincronização manual com a nuvem"
          tone="muted"
        />
      </SettingsGroup>

      <SettingsGroup title="Privacidade e dados">
        <div className="flex flex-col gap-3 px-4 py-4">
          <div>
            <p className="text-[15px] font-medium text-foreground">Exportar todos os dados</p>
            <p className="text-sm text-foreground/60">
              Baixa ou compartilha um arquivo com suas medições e sua faixa pessoal.
            </p>
          </div>
          <div>
            <ExportAllDataButton />
          </div>
        </div>
        <SettingsLinkRow
          icon={Shield}
          label="Central de privacidade"
          description="Revogar consentimento e excluir conta"
          href="/app/privacidade"
        />
        <SettingsStaticRow
          icon={Trash2}
          label="Excluir conta e dados"
          description="Disponível quando a autenticação real estiver completa"
          tone="muted"
        />
      </SettingsGroup>

      <SettingsGroup title="Sobre">
        <SettingsStaticRow icon={Info} label="Versão do aplicativo" trailing="0.1.0 (dev)" />
        <SettingsLinkRow icon={FileText} label="Política de privacidade" href="/privacidade" />
        <SettingsLinkRow icon={FileText} label="Termos de uso" href="/termos" />
      </SettingsGroup>

      <SettingsGroup title="Conta">
        <SignOutButton />
      </SettingsGroup>
    </div>
  );
}
