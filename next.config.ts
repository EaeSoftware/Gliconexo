import type { NextConfig } from "next";

// Cabeçalhos de segurança "seguros" (baixo risco de quebrar alguma
// funcionalidade), conforme CLAUDE.md, seção 15. Uma Content-Security-
// Policy completa foi propositalmente deixada de fora desta entrega: ela
// precisa liberar o CDN do Tesseract.js (`cdn.jsdelivr.net`, usado pelo
// OCR) e, no futuro, o domínio real do projeto Supabase — nenhum dos
// dois pôde ser validado ponta a ponta neste ambiente (o proxy de rede
// da sandbox bloqueia o CDN, e o Supabase ainda não está conectado). Uma
// CSP mal calibrada quebraria a câmera/OCR silenciosamente, então prefere-
// se documentar isso como pendência (docs/privacy-and-security.md) a
// declarar algo não testado.
async function securityHeaders() {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(), geolocation=()",
        },
      ],
    },
    {
      // O service worker precisa ser revalidado a cada carregamento para
      // que atualizações sejam detectadas prontamente (o fluxo de
      // "nova versão disponível" depende disso) — sem isso, um
      // Cache-Control padrão de arquivo estático poderia atrasar a
      // detecção por horas.
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-cache" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ];
}

const nextConfig: NextConfig = {
  headers: securityHeaders,
};

export default nextConfig;
