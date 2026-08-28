"use client";

import { useEffect, useState } from "react";

/**
 * Registra `public/sw.js` (apenas em produção — em `next dev` o service
 * worker atrapalharia o hot reload) e expõe se há uma versão nova
 * instalada e aguardando para assumir o controle da página.
 *
 * A troca de versão é controlada pelo usuário: o worker novo fica em
 * estado "waiting" até `applyUpdate()` mandar `SKIP_WAITING`, e só então
 * a página recarrega — nunca troca sozinho no meio do uso (CLAUDE.md,
 * seção 14, "service worker com atualizacao controlada").
 */
export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    function watchInstallingWorker(worker: ServiceWorker) {
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }
      });
    }

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      if (cancelled) return;
      setRegistration(reg);

      if (reg.waiting && navigator.serviceWorker.controller) {
        setUpdateAvailable(true);
      }

      if (reg.installing) watchInstallingWorker(reg.installing);
      reg.addEventListener("updatefound", () => {
        if (reg.installing) watchInstallingWorker(reg.installing);
      });
    }).catch(() => {
      // Registro falhou (ex.: navegador sem suporte real, ambiente sem
      // HTTPS): a aplicação continua funcionando normalmente sem PWA
      // offline completo, só sem esse reforço.
    });

    let reloading = false;
    function handleControllerChange() {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  function applyUpdate() {
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }

  return { updateAvailable, applyUpdate };
}
