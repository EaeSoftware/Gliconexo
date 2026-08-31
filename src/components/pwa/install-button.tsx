"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useStandaloneDisplay } from "@/lib/pwa/use-standalone-display";

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
    return <p className="text-sm text-foreground/70">O aplicativo já está instalado neste dispositivo.</p>;
  }

  if (!installEvent) {
    return (
      <p className="text-sm text-foreground/70">
        No iOS, toque em compartilhar{" "}
        <span aria-hidden="true">⎋</span> e depois em &ldquo;Adicionar à Tela
        de Início&rdquo;. No Android/desktop, o navegador oferecerá a opção
        de instalar quando disponível.
      </p>
    );
  }

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  return (
    <Button type="button" variant="outline" onClick={handleInstall}>
      Instalar aplicativo
    </Button>
  );
}
