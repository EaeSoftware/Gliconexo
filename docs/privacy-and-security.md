# Privacidade e segurança — GlicoNexo

Este documento resume as decisões de privacidade e segurança já aplicadas
e as que ainda estão pendentes. **Nada aqui declara conformidade legal
completa** — os textos de política de privacidade e termos de uso
(`src/app/(public)/privacidade`, `src/app/(public)/termos`) são rascunhos
explicitamente marcados como pendentes de revisão jurídica.

## Natureza dos dados

Medições de glicemia e demais dados de saúde são tratados como **dados
pessoais sensíveis**, nos termos da LGPD. O produto não realiza
diagnóstico, não prescreve tratamento, não calcula dose de insulina e não
substitui avaliação profissional — essa mensagem aparece na página
inicial, no onboarding e nas telas do app.

## Implementado nesta entrega

- Formulários usam validação Zod tanto no cliente quanto como contrato de
  tipos compartilhado (a validação equivalente no servidor/banco será
  adicionada junto das migrations, na Fase 2).
- `SUPABASE_SERVICE_ROLE_KEY` não é referenciada em nenhum código do
  cliente — apenas o padrão está documentado em `.env.example`.
- Nenhuma variável sensível usa o prefixo `NEXT_PUBLIC_*` além da URL e
  da chave anônima do Supabase (que são públicas por design).
- `prefers-reduced-motion` é respeitado globalmente (`globals.css`).
- Formulário de recuperação de senha sempre mostra uma mensagem genérica,
  para não confirmar se um e-mail existe na base.
- **Câmera e OCR**: a foto é processada inteiramente no navegador
  (leitor de 7 segmentos via OpenCV.js local, com fallback Tesseract.js
  local) e **nunca é enviada a nenhum servidor** nem persistida — existe
  só como `Blob`/object URL/`cv.Mat` em memória enquanto o usuário está
  na tela de captura, revogado/liberado ao salvar, cancelar ou tentar
  novamente (`src/features/ocr/components/camera-capture-flow.tsx`). A
  permissão da câmera só é solicitada quando o usuário toca em
  "Fotografar", nunca antes. Nenhum resultado intermediário é "chutado":
  se a confiança for insuficiente, o leitor retorna sem valor e a
  confirmação manual (obrigatória em qualquer caso) assume.
- **Dependência de terceiros documentada**: na primeira vez que o
  fallback de OCR roda em cada dispositivo, o navegador baixa o motor
  (WebAssembly) e o modelo de idioma do CDN público do Tesseract.js
  (`cdn.jsdelivr.net`) — configuração padrão da biblioteca. Nenhum dado
  do usuário (foto, valor, observação) é enviado nessa chamada, só o
  próprio código/modelo do motor é baixado. O WASM do OpenCV.js (leitor
  de 7 segmentos, usado antes desse fallback) **não** tem essa
  dependência de terceiros — é servido pelo próprio domínio da
  aplicação, como qualquer outro asset do bundle. Ver
  `docs/architecture.md` ("Câmera e OCR").
- Exportação de dados (CSV/JSON) sai do dispositivo apenas por ação
  explícita do usuário (botão de exportar), via download comum ou pela
  Web Share API nativa — nunca automaticamente, nunca para um servidor
  próprio.
- **Service worker sem dados privados**: `public/sw.js` intercepta e
  cacheia apenas assets estáticos (ícones, `_next/static/*`, manifest) e
  a navegação para páginas **públicas** (landing, entrar, cadastro,
  privacidade, termos, onboarding). Qualquer caminho sob `/app/*`
  (autenticado, com dados de glicemia) ou `/auth`/`/api` passa direto
  para a rede, nunca é armazenado em `Cache Storage` — CLAUDE.md, seção
  14. Detalhe técnico completo em `docs/architecture.md` ("Service
  worker e cache").
- **Cabeçalhos de segurança** (`next.config.ts`): `X-Content-Type-
  Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
  e `Permissions-Policy: camera=(self), microphone=(), geolocation=()`
  — liberando a câmera só para a própria origem (necessária para o OCR)
  e negando microfone/geolocalização, que o app não usa.

### Exclusão de conta

`POST /api/conta/excluir` (`src/app/api/conta/excluir/route.ts`):

1. aceita só requisições da mesma origem (`Origin` igual ao host);
2. identifica o usuário pela sessão (cookies), nunca por id vindo do cliente;
3. recusa visitantes anônimos (a opção é para contas com e-mail e senha);
4. reconfirma a senha num cliente Supabase isolado, sem persistir sessão;
5. apaga o usuário com `auth.admin.deleteUser` usando
   `SUPABASE_SERVICE_ROLE_KEY`, que existe só no servidor. Os dados em
   `profiles`, `user_preferences`, `glucose_measurements` e
   `consent_records` saem junto por `on delete cascade`;
6. devolve mensagens genéricas, sem detalhes internos;
7. o cliente apaga o IndexedDB local e encerra a sessão depois do sucesso.

Sem `SUPABASE_SERVICE_ROLE_KEY` configurada no ambiente (Vercel), a rota
responde 503 e a tela mostra "temporariamente indisponível". Pendente:
rate limiting dedicado nesta rota.

## Pendente (fases seguintes)

- HTTPS em produção (depende do provedor de deploy — pendência
  registrada em `docs/database.md` junto da conta Supabase/Vercel).
- **Content Security Policy completa** — propositalmente adiada. Uma CSP
  precisa liberar explicitamente o CDN do Tesseract.js
  (`cdn.jsdelivr.net`) e, quando existir, o domínio real do projeto
  Supabase; nenhum dos dois pôde ser validado neste ambiente (o proxy de
  rede da sandbox bloqueia o CDN, e o Supabase ainda não está
  conectado). Uma CSP mal calibrada quebraria a câmera/OCR ou o futuro
  login silenciosamente — melhor registrar como pendência a testar num
  ambiente real do que declarar algo não verificado (CLAUDE.md, seção
  24). Os três cabeçalhos de baixo risco (`X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) já estão ativos, ver acima.
- Row Level Security e políticas descritas em `docs/database.md`.
- Rate limiting em rotas server-side sensíveis.
- Sanitização de observações antes de renderizar/exportar (relevante a
  partir da Fase 3, quando notas passam a ser persistidas e exibidas).
- Função server-side/Edge Function de exclusão de conta, validando o JWT
  e nunca confiando em `user_id` vindo do cliente.
- Garantia de que nenhuma medição apareça em analytics, logs, breadcrumbs
  de erro ou URLs (a ser verificado quando a telemetria for introduzida).
- Limpeza dos dados locais (IndexedDB) por `user_id`, após logout
  concluído — ainda não existe login/logout real, então não há o que
  limpar por usuário hoje; isto é trabalho da Fase 2/4.
- Exclusão de conta (server-side, Fase 7) — a exportação completa de
  dados já existe (`ExportAllDataButton`), mas a exclusão continua
  desabilitada de propósito até a autenticação real existir.

## Retenção e exclusão

A política de retenção final ainda não foi definida — deve ser
documentada aqui antes de a exclusão de conta ser implementada
(depende da autenticação real, Fase 2). A exportação completa de dados
locais já existe (Configurações e Central de privacidade dentro do
app).

## Checklist de segurança para revisão contínua

Ver `CLAUDE.md`, seção 19 ("Segurança"), para a lista completa de testes
de segurança obrigatórios (isolamento entre usuários, acesso anônimo,
exposição de `service_role`, XSS via observações, vazamento de dados em
URLs/logs, cache indevido pelo service worker).
