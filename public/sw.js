// Service worker do GlicoNexo.
//
// Escrito manualmente (sem Serwist/next-pwa): a versão do Next.js usada
// neste projeto (16.x) roda em Turbopack por padrão, e o plugin de build
// do Serwist (`@serwist/next`, baseado em webpack) ainda não suporta
// Turbopack — ver https://github.com/serwist/serwist/issues/54. A
// alternativa oficial (`@serwist/turbopack`) resolve isso servindo o
// service worker via uma Route Handler que empacota o worker com
// esbuild-wasm em tempo de execução; o próprio pacote se descreve como
// "workaround... enquanto plugins ainda não são suportados" no Turbopack.
// Para um app que lida com dados sensíveis de saúde, preferimos um
// arquivo estático simples e auditável a essa cadeia experimental.
//
// Consequência prática: não há um "manifest" de precache gerado no build
// (o que o Serwist faria automaticamente com hash de conteúdo). Em vez
// disso, as estratégias abaixo são por rota/prefixo, e CACHE_VERSION deve
// ser incrementado manualmente sempre que este arquivo mudar de forma
// que exija invalidar o cache antigo. Documentado em
// docs/architecture.md ("Service worker e cache").

const CACHE_VERSION = "v2";
const STATIC_CACHE = `gliconexo-static-${CACHE_VERSION}`;
const SHELL_CACHE = `gliconexo-shell-${CACHE_VERSION}`;
const CURRENT_CACHES = [STATIC_CACHE, SHELL_CACHE];

const OFFLINE_URL = "/offline";

// Página offline + ícones essenciais: pré-cacheados na instalação para
// que o app tenha algo para mostrar mesmo numa primeira visita offline
// (desde que o service worker já tenha sido instalado numa visita
// online anterior — isso é uma limitação inerente a qualquer PWA, não
// deste service worker em particular).
const PRECACHE_URLS = [OFFLINE_URL, "/icons/icon-192.png", "/manifest.webmanifest"];

// Rotas protegidas (autenticadas, com dados de saúde) — nunca cacheadas.
// Ver CLAUDE.md, seção 14: "nao cachear HTML autenticado com dados
// privados no service worker".
const PROTECTED_PREFIX = "/app";

// Prefixos de operação sensível — sempre rede, nunca interceptados nem
// cacheados (autenticação, futuras rotas de API).
const SENSITIVE_PREFIXES = ["/auth", "/api"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(PRECACHE_URLS);
      // Não chama skipWaiting() automaticamente — a atualização é
      // controlada pelo cliente (ver src/lib/pwa/use-service-worker.ts),
      // para poder avisar o usuário antes de trocar de versão.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith("gliconexo-") && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/logo/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/apple-icon.png" ||
    url.pathname === "/icon.png"
  );
}

function isSensitivePath(pathname) {
  return SENSITIVE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || (await networkPromise) || Response.error();
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const offlinePage = await cache.match(OFFLINE_URL);
    return offlinePage || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // nunca intercepta terceiros (ex.: CDN do OCR)

  if (isSensitivePath(url.pathname)) return; // sempre rede

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  const isNavigation = request.mode === "navigate";
  const isProtected = url.pathname === PROTECTED_PREFIX || url.pathname.startsWith(`${PROTECTED_PREFIX}/`);

  if (isProtected) {
    // Dados privados: nunca cacheia a resposta. Em navegação offline sem
    // rede, mostra a página offline genérica (nunca HTML autenticado
    // antigo) — os dados reais continuam disponíveis via IndexedDB assim
    // que o app carregar.
    if (isNavigation) {
      event.respondWith(networkFirstNavigation(request));
    }
    return;
  }

  if (isNavigation) {
    // Páginas públicas (landing, entrar, cadastro, onboarding etc.):
    // seguras para cache — stale-while-revalidate mantém a navegação
    // rápida e funcionando offline depois da primeira visita.
    event.respondWith(staleWhileRevalidate(request));
  }
});

