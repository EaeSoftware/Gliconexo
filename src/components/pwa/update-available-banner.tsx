"use client";

import { useServiceWorker } from "@/lib/pwa/use-service-worker";
import { Button } from "@/components/ui/button";

// Renderizada em fluxo normal (nunca `position: fixed`), no topo do
// layout — empurra o conteúdo abaixo em vez de flutuar sobre ele. Isso é
// proposital: um banner fixo no rodapé cobriria a barra de navegação
// inferior/gestos nativos do Android e iOS, o que o usuário do produto
// pediu explicitamente para evitar (mesmo cuidado já usado nos botões de
// exportação — ver docs/telas.md, "Exportação e compartilhamento no
// mobile").
export function UpdateAvailableBanner() {
  const { updateAvailable, applyUpdate } = useServiceWorker();

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-center gap-3 border-b border-border bg-surface-muted px-4 py-2 text-sm text-foreground"
    >
      <span>Uma nova versão do GlicoNexo está disponível.</span>
      <Button type="button" variant="outline" className="min-h-8 px-4 py-1 text-xs" onClick={applyUpdate}>
        Atualizar agora
      </Button>
    </div>
  );
}
