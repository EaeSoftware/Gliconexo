import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "Você está offline",
};

// Página estática, pré-cacheada pelo service worker (public/sw.js), usada
// como resposta de navegação quando a rede falha e não há nada em cache
// para a rota pedida. Nunca mostra dados privados: se o usuário estava
// numa tela protegida, os dados reais dela continuam intactos no
// IndexedDB e voltam a aparecer assim que o app conseguir carregar de
// verdade (online, ou a partir do cache do shell já visitado).
export default function OfflinePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo size="md" />
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Você está offline</h1>
        <p className="text-sm text-foreground/70">
          Não foi possível carregar esta página sem internet. Se você já
          tinha aberto o GlicoNexo neste dispositivo antes, seus registros
          continuam salvos localmente e vão aparecer normalmente assim que
          o app terminar de carregar.
        </p>
      </div>
      <ButtonLink href="/" variant="primary">
        Tentar novamente
      </ButtonLink>
    </div>
  );
}
