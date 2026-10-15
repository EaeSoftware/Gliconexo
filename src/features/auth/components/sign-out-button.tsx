"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { clearActiveUserLocalData, setActiveUser } from "@/lib/db/schema";
import { SettingsButtonRow } from "@/components/ui/settings-row";
import { Button } from "@/components/ui/button";
import { ExportAllDataButton } from "@/features/privacy/components/export-all-data-button";
import {
  getLocalDataSummary,
  hasLocalData,
  type LocalDataSummary,
} from "@/features/auth/local-data-summary";

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  // Resumo do que seria apagado; só preenchido quando há algo a perder.
  const [pending, setPending] = useState<LocalDataSummary | null>(null);

  async function signOut() {
    setIsLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // CLAUDE.md seção 13: dados locais privados devem ser removidos
      // após um logout concluído, para não ficarem visíveis a quem
      // usar o mesmo dispositivo em seguida.
      await clearActiveUserLocalData();
      setActiveUser(null);
    } finally {
      router.push("/entrar");
      router.refresh();
    }
  }

  async function onSignOutClick() {
    setIsLoading(true);
    try {
      const summary = await getLocalDataSummary();
      if (hasLocalData(summary)) {
        setPending(summary);
        setIsLoading(false);
        return;
      }
    } catch {
      // Não conseguiu conferir o que existe: pelo lado seguro, pede confirmação.
      setPending({ measurements: 0, photos: 0 });
      setIsLoading(false);
      return;
    }
    await signOut();
  }

  return (
    <>
      <SettingsButtonRow
        icon={LogOut}
        label={isLoading ? "Saindo..." : "Sair"}
        tone="danger"
        disabled={isLoading}
        onClick={onSignOutClick}
      />
      {pending ? (
        <div role="alertdialog" aria-labelledby="sign-out-warning-title" className="px-4 py-4">
          <h3 id="sign-out-warning-title" className="mb-1 text-sm font-semibold text-foreground">
            Antes de sair
          </h3>
          <p className="mb-3 text-sm text-foreground/70">
            {hasLocalData(pending)
              ? `Você tem ${pluralize(pending.measurements, "medição", "medições")}${
                  pending.photos > 0
                    ? ` e ${pluralize(pending.photos, "foto do visor", "fotos do visor")}`
                    : ""
                } guardadas somente neste aparelho.`
              : "Não foi possível conferir o que está guardado neste aparelho."}{" "}
            Ainda não existe cópia na nuvem: ao sair, esses dados são apagados daqui e não podem ser
            recuperados. Exporte antes se quiser guardá-los (as fotos não entram nesse arquivo; elas
            podem ir no PDF, em Relatórios).
          </p>
          <div className="flex flex-col gap-3">
            <ExportAllDataButton />
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPending(null)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-status-below text-white hover:bg-status-below/90"
                onClick={signOut}
                disabled={isLoading}
              >
                {isLoading ? "Saindo..." : "Sair e apagar deste aparelho"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
