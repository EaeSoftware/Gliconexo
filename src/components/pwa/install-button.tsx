"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useStandaloneDisplay } from "@/lib/pwa/use-standalone-display";
import { SettingsButtonRow, SettingsStaticRow } from "@/components/ui/settings-row";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPwaButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const isStandalone = useStandaloneDisplay();

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (isStandalone) {
    return (
      <SettingsStaticRow
        icon={Download}
        label="Instalar aplicativo"
        description="Já instalado neste dispositivo"
        tone="muted"
      />
    );
  }

  if (!installEvent) {
    return (
      <SettingsStaticRow
        icon={Download}
        label="Instalar aplicativo"
        description={
          'No iOS: toque em compartilhar e depois em "Adicionar à Tela de Início". No Android/desktop, o navegador oferecerá a opção quando disponível.'
        }
      />
    );
  }

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <SettingsButtonRow
      icon={Download}
      label="Instalar aplicativo"
      description="Adicione o GlicoNexo à tela inicial"
      onClick={handleInstall}
      trailing="Instalar"
    />
  );
}
