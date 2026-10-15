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
  (PaddleOCR via `onnxruntime-web`) e **nunca é enviada a nenhum
  servidor**. Enquanto o usuário está na tela de captura ela existe só
  como `Blob`/object URL em memória, revogada ao salvar, cancelar ou
  tentar novamente (`src/features/ocr/components/camera-capture-flow.tsx`).
  **Exceção opcional, decidida em 08/10/2026:** ao confirmar uma leitura
  por câmera, o usuário pode deixar ligada a opção "Guardar foto do visor
  neste aparelho" (ver "Fotos do visor guardadas no aparelho" abaixo). A
  permissão da câmera só é solicitada quando o usuário toca em
  "Fotografar", nunca antes. Nenhum resultado intermediário é "chutado":
  se a confiança for insuficiente, o leitor retorna sem valor e a
  confirmação manual (obrigatória em qualquer caso) assume.
- **Dependência de terceiros documentada**: na primeira vez que o OCR
  roda em cada dispositivo, o navegador baixa os pesos do modelo do
  PaddleOCR (~6 MB, do Hugging Face, via `ppu-paddle-ocr`). Nenhum dado
  do usuário (foto, valor, observação) é enviado nessa chamada, só o
  próprio modelo é baixado — mas isso exige internet no primeiro uso.
  Ver `docs/architecture.md` ("Câmera e OCR") e
  `docs/historico-correcoes.md`.
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

### Fotos do visor guardadas no aparelho

Decisão de 08/10/2026 (o `CLAUDE.md`, seção 17, regra 10, só permite
persistir foto com consentimento específico):

- No registro por câmera, a tela de confirmação mostra a opção **"Guardar
  foto do visor neste aparelho"**, **ligada por padrão**, com o aviso de
  que a foto fica só no aparelho, nunca vai a um servidor e some junto
  com a medição. O usuário pode desligá-la antes de salvar; se remover a
  imagem, nada é guardado e a origem vira "manual".
- Guarda-se **apenas o recorte confirmado**, reduzido (largura máxima de
  640 px, JPEG ~0,8), na tabela `ocrImages` do IndexedDB do usuário
  (`src/lib/db/ocr-image-repository.ts`). Nunca entra em `measurements`,
  no CSV nem no JSON de "todos os dados", e **não é sincronizada**.
- A foto é apagada **quando a medição é excluída** (`measurementRepository.remove`)
  ou quando o usuário toca em "Remover foto" no detalhe da medição. Como o
  app não tem purge de tombstones, manter a foto depois da exclusão a
  deixaria para sempre no aparelho; por isso ela não é mantida. O
  "desfazer" do histórico guarda o blob só em memória durante a janela do
  desfazer.
- Logout concluído e exclusão de conta apagam o banco inteiro do usuário
  (`clearActiveUserLocalData`), fotos inclusive. Como ainda não há
  sincronização, o botão **Sair** conta o que existe só neste aparelho
  (`src/features/auth/local-data-summary.ts`) e, havendo medições ou fotos,
  mostra um aviso com opção de exportar e de cancelar antes de apagar
  (CLAUDE.md seções 10.2 e 17, regra 11).
- No PDF, as fotos só entram se o usuário marcar "Incluir no PDF as fotos
  do visor" ao exportar (limite de 40 por documento).
- **Limitações:** o IndexedDB não protege contra aparelho comprometido
  (mesma limitação dos demais dados locais). **Pendência jurídica:** os
  textos de `/privacidade` agora descrevem as fotos e como encerrar o
  tratamento, mas são rascunhos; a `TERMS_DOCUMENT_VERSION` não foi alterada
  (mudar a versão pede novo aceite dos usuários, decisão do responsável pelo
  produto). Precisam de revisão jurídica antes de qualquer uso real. Quando existir sincronização, guardar foto na nuvem
  exigirá decisão própria (Storage com RLS e consentimento específico).

### Revogação de consentimento (pendência)

Em 08/10/2026 o botão "Revogar consentimento" foi removido da central de
privacidade (decisão do responsável pelo produto). O `CLAUDE.md` (seções
10.3, 10.13 e 15) pede consentimento revogável; hoje o caminho disponível
no app para encerrar o tratamento é **Excluir conta e dados**. A coluna
`revoked_at` de `consent_records` continua existindo, sem fluxo na
interface. Antes de uso real é preciso definir juridicamente como a
revogação será oferecida (por exemplo, contato com o responsável). Este
projeto **não** declara conformidade total com a LGPD.

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
