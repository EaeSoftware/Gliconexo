# Telas — GlicoNexo

Este documento descreve **cada tela existente hoje no código**, o que ela
faz, o que já funciona de verdade e o que ainda é placeholder. É um
complemento a `docs/architecture.md` (arquitetura) e `docs/testing.md`
(testes) — aqui o foco é "o que essa tela faz", tela por tela.

Legenda de status:

- ✅ **Funcional** — a interface faz o que descreve, de ponta a ponta, dentro do que a fase atual permite.
- 🟡 **Parcial** — a interface existe e responde ao usuário, mas uma parte do fluxo (geralmente persistência de dados) ainda não está ligada.
- ⚪ **Placeholder** — mostra o estado correto (vazio/bloqueado/em breve), mas não tem lógica real por trás ainda.

---

## Rotas públicas (`src/app/(public)/`)

### `/` — Página inicial
**Arquivo:** `src/app/(public)/page.tsx` · **Status:** ✅ Funcional

Landing page institucional. Mostra o nome GlicoNexo, uma frase de
benefício, o aviso obrigatório de que o app não substitui acompanhamento
médico, os botões `Criar conta` / `Entrar`, e três cartões explicando as
frentes do produto (câmera + OCR, modo offline, histórico/relatórios).
Não depende de login nem de dados — é só apresentação.

### `/entrar` — Entrar
**Arquivo:** `src/app/(public)/entrar/page.tsx` · **Componente:** `LoginForm` (`src/features/auth/components/login-form.tsx`) · **Status:** 🟡 Parcial

Formulário de e-mail/senha com validação Zod (`loginSchema`) via
React Hook Form. Ao enviar, chama de verdade
`supabase.auth.signInWithPassword(...)` e, se der certo, redireciona para
`/app`. **Funciona assim que houver um projeto Supabase configurado** em
`.env.local` — hoje, sem credenciais reais, a chamada falha e mostra a
mensagem de erro genérica "Não foi possível entrar". Link para
`/recuperar-senha`.

### `/cadastro` — Criar conta
**Arquivo:** `src/app/(public)/cadastro/page.tsx` · **Componente:** `SignupForm` · **Status:** 🟡 Parcial

Mesmo padrão do login: e-mail, senha (mínimo 8 caracteres), confirmação
de senha e um checkbox obrigatório de aceite dos termos/privacidade
(`signupSchema`, com `refine` garantindo que as senhas coincidem). Chama
`supabase.auth.signUp(...)`. Também depende de credenciais reais do
Supabase para de fato criar a conta; até lá, mostra erro genérico.

### `/recuperar-senha` — Recuperar senha
**Arquivo:** `src/app/(public)/recuperar-senha/page.tsx` · **Componente:** `ResetPasswordForm` · **Status:** 🟡 Parcial

Pede só o e-mail e chama `supabase.auth.resetPasswordForEmail(...)`.
Sempre mostra a mesma mensagem de sucesso genérica, mesmo se o e-mail não
existir na base — isso é intencional (evita confirmar para um atacante
se um e-mail está cadastrado).

### `/privacidade` — Política de privacidade (pública)
**Arquivo:** `src/app/(public)/privacidade/page.tsx` · **Status:** ⚪ Placeholder de conteúdo

Texto explicando que dados de glicemia são sensíveis (LGPD), o que o app
faz com eles e quais são os direitos do usuário. Traz um aviso fixo
("rascunho pendente de revisão jurídica") no topo — o texto em si é
provisório, mas a tela e a navegação até ela já são reais.

### `/termos` — Termos de uso
**Arquivo:** `src/app/(public)/termos/page.tsx` · **Status:** ⚪ Placeholder de conteúdo

Mesmo padrão da página de privacidade: natureza do serviço (não é
diagnóstico) e responsabilidade do usuário. Também marcado como rascunho.

### `/onboarding` — Boas-vindas (4 passos)
**Arquivo:** `src/app/onboarding/page.tsx` · **Componente:** `OnboardingFlow` (`src/features/onboarding/components/onboarding-flow.tsx`) · **Status:** 🟡 Parcial

Assistente de 4 passos com barra de progresso: (1) objetivo do app, (2)
como fotografar o glicosímetro, (3) histórico/offline/relatórios, (4)
privacidade + checkbox de consentimento (obrigatório para habilitar
"Concluir"). Ao concluir, navega para `/app`. **O que falta:** o aceite
não é gravado em lugar nenhum ainda — a tabela `consent_records`
(`docs/database.md`) só existe no papel. Isso está marcado com
`TODO (Fase 2)` no código.

---

## App protegido (`src/app/(protected)/app/`)

Todas as telas abaixo compartilham o layout em
`src/app/(protected)/layout.tsx`: sidebar fixa no desktop, barra de
navegação inferior no mobile (`Início · Registrar · Histórico ·
Relatórios · Perfil`), e um indicador Online/Offline no topo (mobile) —
este último já é real, baseado no evento `online`/`offline` do
navegador (`useOnlineStatus`). **Nenhuma rota aqui verifica sessão
ainda** — a proteção de fato (redirecionar quem não está logado) é
trabalho da Fase 2, junto da autenticação.

### `/app` — Início
**Arquivo:** `src/app/(protected)/app/page.tsx` · **Componente:** `HomeDashboard` (`src/features/measurements/components/home-dashboard.tsx`) · **Status:** ✅ Funcional (dados locais reais)

Saudação, botão grande "Registrar glicemia" e card de "última medição" —
lêem de verdade o IndexedDB local via `useLiveQuery` (Dexie), então a
tela atualiza sozinha assim que uma medição é criada/editada/excluída em
qualquer outra aba/tela.

Antes da quarta medição confirmada, mostra o progresso "X de 4 medições
registradas" com uma barra e a explicação de que os gráficos aparecem
depois da quarta (regra real e testada em `getDashboardProgress`) — como
pede CLAUDE.md 10.4. **A partir da quarta**, esse card é substituído por
um resumo dos últimos 30 dias (também exigido pela seção 10.4): média,
mínimo, máximo, quantidade de registros, distribuição abaixo/dentro/acima
da faixa (quando configurada) e o mesmo gráfico de linha temporal usado
em Análises, mais um link "Ver análise completa". *(Corrigido nesta
entrega: antes, o card de progresso continuava mostrando "X de 4" mesmo
com X bem maior que 4, ex. "13 de 4 medições registradas" — bug
encontrado numa revisão visual com dados sintéticos.)*
**O que ainda falta:** isso é só o dispositivo atual — sem sincronização
com o Supabase (Fase 4), o mesmo histórico não aparece em outro
aparelho.

### `/app/registrar` — Registrar medição
**Arquivo:** `src/app/(protected)/app/registrar/page.tsx` · **Componente:** `RegisterTabs` (`src/features/measurements/components/register-tabs.tsx`) · **Status:** ✅ Funcional (as duas abas)

Duas abas, como pede a especificação:

- **⌨️ Digitar valor** — formulário completo (`ManualEntryForm`,
  `src/features/measurements/components/manual-entry-form.tsx`): valor em
  mg/dL (validação 1–999, inteiro), data/hora pré-preenchida e editável,
  contexto (jejum, café da manhã, almoço, etc.), relação com a refeição,
  observação opcional. Ao confirmar, **salva de verdade no IndexedDB**
  (`measurementRepository.create`, via Dexie) com UUID gerado no
  cliente, e mostra uma tela de confirmação com atalhos para "Registrar
  outra" ou "Ver histórico". Ainda não sincroniza com a nuvem — o texto
  da confirmação avisa isso.
- **📷 Usar câmera** — fluxo completo de captura + OCR
  (`CameraCaptureFlow`, `src/features/ocr/`): pede permissão só ao
  tocar em "Fotografar" (câmera traseira quando disponível, com moldura
  de alinhamento), permite girar e recortar a imagem, roda um
  pré-processamento local (escala de cinza, contraste, redução de
  ruído, binarização em 3 níveis de limiar) e reconhece dígitos com
  Tesseract.js — restrito a `0-9`, carregado só quando o usuário chega
  nesta etapa. O resultado (com nível de confiança) preenche o mesmo
  `ManualEntryForm` usado no registro manual, sempre exigindo
  confirmação antes de salvar; sem candidato reconhecido, o campo fica
  em branco para digitação manual, com a foto ainda visível. A foto
  nunca é enviada a nenhum servidor nem persistida — o object URL
  temporário é revogado ao salvar, cancelar ou tentar novamente. Sem
  `getUserMedia` (ou permissão negada), cai automaticamente para
  `<input type="file" accept="image/*" capture="environment">`.
  **Limitação conhecida:** o motor de OCR (WebAssembly) e o modelo de
  idioma são baixados do CDN público do Tesseract.js na primeira vez —
  exige internet nesse momento; ver "OCR e conectividade" abaixo.

### `/app/historico` — Histórico
**Arquivo:** `src/app/(protected)/app/historico/page.tsx` · **Componente:** `HistoryList` (`src/features/measurements/components/history-list.tsx`) · **Status:** ✅ Funcional (dados locais reais)

Lista as medições reais do dispositivo, agrupadas por dia
(`groupMeasurementsByDay`), mais recentes primeiro, atualizando ao vivo
via `useLiveQuery`. Filtros funcionais de período (7/30/90 dias, tudo, ou
personalizado com dois campos de data), contexto e origem
(`filterMeasurements`, com testes unitários). Cada linha mostra
valor/horário/contexto, um selo "Manual" ou "Câmera", e um selo
"Pendente" (ainda não sincronizado — vira "Sincronizado" na Fase 4).
Exclusão com confirmação inline por linha, e uma barra "Medição
excluída · Desfazer" por ~6 segundos antes de a exclusão lógica ser
considerada definitiva (`measurementRepository.remove`/`restore`),
conforme CLAUDE.md 10.9. Quando uma faixa pessoal está configurada (ver
Configurações), cada linha também mostra um selo "Abaixo"/"Dentro"/
"Acima" (texto + ícone + cor, nunca só cor) e o filtro "Faixa" passa a
funcionar de verdade; sem faixa configurada, o filtro fica desabilitado
com uma explicação.

### `/app/historico/[id]` — Detalhe da medição
**Arquivo:** `src/app/(protected)/app/historico/[id]/page.tsx` · **Componente:** `MeasurementDetail` (`src/features/measurements/components/measurement-detail.tsx`) · **Status:** ✅ Funcional (dados locais reais)

Busca a medição real pelo `id` (`useLiveQuery` + `getDb().measurements.get`).
Se o registro não existir neste dispositivo (id errado, já excluído, ou
aberto em outro aparelho sem sincronização), mostra um estado "Medição
não encontrada" com um botão para voltar ao histórico — isso é
tratado na própria tela em vez de usar `notFound()` do Next.js, porque
o dado é local (IndexedDB), então o servidor nunca teria como saber se
existe. Modo "Editar" reaproveita o `ManualEntryForm` (preserva a
origem original, incrementa `version`/`updatedAt`), e "Excluir" pede
confirmação antes de fazer a exclusão lógica e voltar ao histórico.
Também mostra o selo de classificação abaixo/dentro/acima quando há
faixa configurada.

### `/app/analises` — Análises
**Arquivo:** `src/app/(protected)/app/analises/page.tsx` · **Componente:** `AnalyticsSummary` (`src/features/measurements/components/analytics-summary.tsx`) · **Status:** ✅ Funcional (dados locais reais)

Com menos de 4 medições confirmadas (considerando o histórico
completo), mostra o estado bloqueado com o número real de medições
restantes (`getDashboardProgress`). A partir da 4ª:

- Filtro de período (7/30/90 dias ou tudo), reaproveitando
  `filterMeasurements` — afeta indicadores, distribuição e gráfico
  abaixo, mas não a regra de desbloqueio (essa sempre olha o histórico
  completo).
- Resumo numérico (última medição, média, mínimo, máximo —
  `computeMeasurementStats`, testado).
- Quando há uma faixa pessoal configurada, os percentuais reais de
  medições abaixo/dentro/acima da faixa (`computeRangeDistribution`,
  testado); sem faixa configurada, mostra a explicação em vez de
  inventar um percentual.
- **Gráfico de linha temporal** (`GlucoseChartSection` +
  `GlucoseLineChart`, via [Recharts](https://recharts.org)), carregado
  sob demanda com `next/dynamic({ ssr: false })` — o código do gráfico
  só entra no bundle quando esta tela é visitada e desbloqueada. Quando
  há faixa configurada, mostra uma área e linhas de referência para o
  mínimo/máximo. Dias sem registro não são preenchidos (sem
  interpolação) e nenhuma tendência futura é projetada.
- Abaixo do gráfico, uma tabela de dados (`<details>`, recolhida por
  padrão) com data/valor/contexto — a alternativa textual acessível
  exigida pelo `CLAUDE.md` (seções 10.11 e 16), útil para navegação por
  teclado/leitor de tela.
- **Glicemia por contexto** (`ContextSeriesSection` +
  `ContextSeriesChart`, também lazy): uma linha por "balde" de contexto
  — café da manhã, almoço, lanche da tarde, jantar, e outros contextos
  (jejum, madrugada, antes de dormir, atividade física, outro agrupados)
  — exatamente como pede CLAUDE.md 10.11. Cada balde tem uma cor fixa,
  validada com o script do skill de dataviz para não ser confundida
  nem com as outras quatro nem com as cores de "abaixo/dentro/acima da
  faixa" usadas na mesma tela (ver `docs/architecture.md`, "Paleta dos
  gráficos por contexto"). Sem interpolar entre pontos de baldes
  diferentes nem entre dias sem dado; legenda própria (em ordem fixa,
  não alfabética) e tabela de dados equivalente.
- **Medições por dia e contexto** (`DailyContextSection` +
  `DailyContextChart`, lazy): barras empilhadas por dia, com a mesma
  paleta e legenda do gráfico anterior — quantidade de medições por dia,
  quebrada por contexto. Dias sem nenhuma medição não aparecem (não são
  inventados com contagem zero). Também com tabela de dados equivalente.

**O que falta:** filtro por contexto e "mês atual" em Análises ficaram
fora deste incremento (o histórico já filtra por contexto).

### `/app/relatorios` — Relatórios
**Arquivo:** `src/app/(protected)/app/relatorios/page.tsx` · **Componente:** `ExportPanel` (`src/features/reports/components/export-panel.tsx`) · **Status:** 🟡 Parcial — CSV real, PDF ainda não existe

Sem medições, mostra "Nenhum dado para exportar ainda". Com medições:
seletor de período (7/30/90 dias/tudo, reaproveitando `PeriodSelect`),
checkbox opcional "Incluir observações no arquivo" (desmarcado por
padrão — observações só entram se o usuário marcar, CLAUDE.md 10.12),
contagem real de medições no período, e um botão que gera um CSV de
verdade (`buildMeasurementsCsv`, testado): UTF-8, cabeçalhos em
português, timestamp ISO **e** horário local, valor/unidade/contexto/
relação com refeição/origem/observação, com escape correto de vírgulas,
aspas e quebras de linha. O botão usa a Web Share API quando disponível
("Compartilhar CSV") ou baixa o arquivo direto ("Baixar CSV") — nunca
`window.open`, para não abrir uma aba nem disparar nenhum comportamento
nativo inesperado no Android/iOS. **O que falta:** exportação em PDF
(ainda mostra uma nota explicando isso).

### `/app/configuracoes` — Configurações
**Arquivo:** `src/app/(protected)/app/configuracoes/page.tsx` · **Status:** 🟡 Parcial

- **Aparência** — ✅ `ThemeToggle` alterna de verdade entre claro/escuro/sistema, persiste em `localStorage` e evita flash incorreto no carregamento (`ThemeScript` no `<head>`).
- **Instalar aplicativo** — ✅ `InstallPwaButton` usa o evento real `beforeinstallprompt`; se o app já estiver instalado, mostra uma mensagem em vez do botão; no iOS, mostra a instrução manual de "Adicionar à Tela de Início".
- **Faixa pessoal de glicemia** — ✅ `TargetRangeForm` (`src/features/preferences/components/target-range-form.tsx`) salva mínimo/máximo de verdade no IndexedDB (`preferencesRepository`, tabela `preferences`). Validação exige os dois valores juntos (ou nenhum) e mínimo &lt; máximo (`targetRangeSchema`, testado). Assim que salva, os selos de classificação e os percentuais em Histórico/Análises passam a considerar essa faixa — sem prometer nenhuma recomendação médica, só a informação.
- **Sincronização** — ⚪ só texto explicando o que vai existir.
- **Privacidade e dados** — 🟡 **"Exportar todos os dados"** agora é real (`ExportAllDataButton`): baixa/compartilha um JSON com todas as medições ativas e a faixa pessoal salvas neste dispositivo. **"Excluir conta e dados"** leva à seção de exclusão em `/app/privacidade` (ver abaixo).
- **Sobre** — ✅ mostra a versão do app e links para as políticas públicas.

### `/app/privacidade` — Central de privacidade (dentro do app)
**Arquivo:** `src/app/(protected)/app/privacidade/page.tsx` · **Status:** 🟡 Parcial

Diferente de `/privacidade` (a política pública), esta é a tela de
**ações** do usuário sobre os próprios dados. "Exportar meus dados" usa
o mesmo `ExportAllDataButton` de Configurações — botão real, gera o
JSON completo. "Excluir conta e dados" (`DeleteAccountSection`) fica
ativo para contas com e-mail e senha: pede a senha atual e a palavra
`EXCLUIR`, chama `POST /api/conta/excluir` e, após sucesso, apaga o
IndexedDB local e encerra a sessão. No modo visitante (login anônimo) a
seção explica que a exclusão é só para contas com e-mail. "Revogar
consentimento" continua desabilitado.

---

## Componentes de apoio usados nas telas acima

| Componente | Onde vive | O que faz |
| --- | --- | --- |
| `Logo` | `src/components/ui/logo.tsx` | Ícone GlicoNexo + wordmark "GlicoNexo", cores adaptadas ao tema. |
| `Button` / `ButtonLink` | `src/components/ui/button.tsx` | Botão padrão do app, 4 variantes (primary/secondary/outline/ghost). |
| `TextField` | `src/components/ui/text-field.tsx` | Campo de formulário acessível (label real, erro com `role="alert"`, `aria-describedby`). |
| `EmptyState` | `src/components/feedback/empty-state.tsx` | Estado vazio reutilizável (ícone, título, descrição, ação). |
| `UndoToast` | `src/components/feedback/undo-toast.tsx` | Barra "excluído · Desfazer" com expiração automática, usada no histórico. |
| `ConnectionStatus` | `src/components/layout/connection-status.tsx` | Badge Online/Offline em tempo real. |
| `ClassificationBadge` | `src/features/measurements/components/classification-badge.tsx` | Selo Abaixo/Dentro/Acima (texto + ícone + cor) usado no histórico e no detalhe. |
| `GlucoseChartSection` | `src/features/measurements/components/glucose-chart-section.tsx` | Gráfico de linha temporal (Recharts, carregado sob demanda) + tabela textual acessível equivalente. |
| `ExportPanel` | `src/features/reports/components/export-panel.tsx` | Exportação de CSV das medições, com período e observações opcionais. |
| `CameraCaptureFlow` | `src/features/ocr/components/camera-capture-flow.tsx` | Orquestra permissão/câmera → recorte/giro → OCR → confirmação. |
| `ImageEditor` / `CropRectOverlay` | `src/features/ocr/components/` | Girar (90°) e recortar (retângulo arrastável/redimensionável) a foto capturada. |
| `ExportAllDataButton` | `src/features/privacy/components/export-all-data-button.tsx` | Exportação/compartilhamento do JSON completo de dados locais. |
| `Sidebar` / `BottomNav` | `src/components/layout/` | Navegação do app protegido, adaptada por breakpoint. |

## Camada de dados local (IndexedDB/Dexie)

Desde esta etapa, `/app`, `/app/registrar`, `/app/historico`,
`/app/historico/[id]` e `/app/analises` (parcialmente) leem e escrevem
de verdade em um banco local no navegador, via
[Dexie](https://dexie.org):

- `src/lib/db/schema.ts` — a classe `GlicoNexoDB`, com as tabelas
  `measurements` e `preferences`, e os tipos `StoredMeasurement`/
  `StoredPreferences`.
- `src/lib/db/measurement-repository.ts` — implementação local da
  interface `MeasurementRepository` sugerida em `CLAUDE.md` (seção 6):
  `list`, `getById`, `create`, `update`, `remove` (exclusão lógica via
  `deletedAt`), mais um `restore` para o "desfazer" da UI.
- `src/lib/db/preferences-repository.ts` — guarda a faixa pessoal de
  glicemia (`targetMinMgDl`/`targetMaxMgDl`) como um único registro
  local (`id: "local"`), já que ainda não há usuário autenticado.
- `src/features/measurements/filter-measurements.ts`,
  `src/features/measurements/stats.ts` e
  `src/features/measurements/classify.ts` — funções puras (testadas em
  `tests/unit/`) para filtrar/agrupar/classificar/calcular estatísticas,
  mantendo essa lógica fora dos componentes visuais.

Isso é só o dispositivo atual: **nada é enviado para o Supabase ainda**
(fila de sincronização é Fase 4), e por isso todo registro aparece com o
selo "Pendente" no histórico. A faixa pessoal também é só local — na
Fase 2, ela vai migrar para `user_preferences` no Supabase (ver
`docs/database.md`).

## Exportação e compartilhamento no mobile

`src/lib/export/download-file.ts` centraliza como os arquivos (CSV, JSON)
saem do app, com cuidado explícito para não conflitar com funções
nativas do Android/iOS nem com a navegação do próprio app:

- Prefere a Web Share API com arquivos (`navigator.share`/`canShare`)
  quando disponível — abre a folha de compartilhamento nativa do
  sistema. Se o usuário cancelar (`AbortError`), a função para ali; ela
  **nunca** dispara um download automático depois de um cancelamento
  explícito.
- Sem Web Share API (ex.: a maioria dos navegadores desktop), cai para
  um download comum via link temporário (`<a download>` + `Blob`) — não
  usa `window.open`, que poderia abrir aba/popup e confundir o fluxo no
  mobile.
- Nenhum elemento novo usa `position: fixed`; os botões de exportação
  ficam no fluxo normal da página, então nunca cobrem nem competem com
  a barra de navegação inferior (`BottomNav`, que já reserva sua própria
  área com `env(safe-area-inset-bottom)` para a faixa de gestos do iOS).

## OCR e conectividade

O reconhecimento roda inteiramente no navegador (Tesseract.js, via
WebAssembly) — a foto nunca sai do dispositivo. Mas a **primeira** vez
que o usuário usa a câmera neste dispositivo, o navegador precisa
baixar o motor (WebAssembly, alguns MB) e o modelo de idioma do CDN
público do próprio Tesseract.js (`cdn.jsdelivr.net`), configuração
padrão da biblioteca (`src/features/ocr/tesseract-provider.ts`). Sem
internet nesse primeiro uso, o OCR falha graciosamente — a foto
continua visível e o campo de valor fica em branco para digitação
manual, nunca bloqueando o registro (CLAUDE.md, seção 17, regra 15).
Isso está registrado como dependência de terceiros em
`docs/privacy-and-security.md`.

**Verificação nesta entrega:** o fluxo completo (permissão → câmera ao
vivo com dispositivo de vídeo sintético do Chromium → captura → girar
→ recortar → confirmação → salvar; e também o caminho por arquivo/
seleção de imagem com uma foto de teste de um visor fictício) foi
testado de ponta a ponta com Playwright contra o build de produção,
sem erros de console. O reconhecimento em si (o resultado do OCR) não
pôde ser verificado ao vivo neste ambiente de desenvolvimento porque a
rede daqui bloqueia o CDN do Tesseract.js — o comportamento de
fallback (nenhum candidato → entrada manual) foi exercitado e
confirmado correto, mas o reconhecimento bem-sucedido de um visor real
depende de teste manual num ambiente com internet livre.

## PWA: instalação, service worker e modo offline

- **Instalação** (`InstallPwaButton`, em Configurações) já era real desde
  a Fase 1 (evento `beforeinstallprompt`, instrução manual no iOS). O que
  esta entrega adiciona é o que faltava para a instalação valer a pena:
  um service worker de verdade e cabeçalhos de segurança básicos.
- **Service worker** (`public/sw.js`, registrado por
  `src/lib/pwa/use-service-worker.ts`, só em produção — nunca em `next
  dev`, para não atrapalhar o hot reload): cache-first para ícones/
  `_next/static/*`/manifest, stale-while-revalidate para a casca das
  páginas públicas (landing, entrar, cadastro, onboarding etc.), e
  **rede apenas (nunca cache) para `/app/*`** — nenhuma tela autenticada
  com dados de glicemia é armazenada pelo service worker, conforme
  CLAUDE.md seção 14. Detalhe técnico e a razão de ter sido escrito à
  mão em vez de usar Serwist: ver "Service worker e cache" em
  `docs/architecture.md`.
- **Página offline** (`/offline`) aparece só quando uma navegação falha
  de verdade e não há nada em cache — nunca mostra dados antigos de uma
  tela protegida, e explica que os dados locais (IndexedDB) continuam
  intactos e voltam a aparecer assim que o app carregar.
- **Atualização controlada**: quando uma nova versão do service worker
  termina de instalar, um aviso "Uma nova versão do GlicoNexo está
  disponível" aparece no topo do app (`UpdateAvailableBanner`, renderizado
  em fluxo normal — nunca `position: fixed`, então nunca cobre a barra de
  navegação inferior nem qualquer gesto nativo do Android/iOS, o mesmo
  cuidado já usado nos botões de exportação). Só troca de versão quando o
  usuário toca em "Atualizar agora".
- **Verificação nesta entrega**: testado com Playwright contra o build
  de produção — o service worker registra e ativa; uma página pública já
  visitada continua renderizando com o servidor totalmente fora do ar
  (processo do `next start` derrubado de propósito); uma rota protegida
  nunca visitada mostra a página `/offline` nessa mesma condição, sem
  vazar nenhum conteúdo antigo; simulando uma nova versão do arquivo
  `sw.js`, o aviso de atualização aparece, não sobrepõe a barra de
  navegação inferior em 390px/320px, e o botão "Atualizar agora"
  realmente troca o controlador da página.

## Como isso se encaixa nas fases do `CLAUDE.md`

Autenticação real (Fase 2) ainda destrava `/entrar`, `/cadastro`,
`/recuperar-senha` e o `TODO` de consentimento do onboarding —
bloqueada por decisão do produto até uma conta Supabase/Vercel própria
ser informada (ver `docs/database.md`). IndexedDB + repositório (Fase 3)
já destravou `/app`, `/app/registrar`, `/app/historico` e
`/app/historico/[id]`, como descrito acima. Sincronização (Fase 4)
ainda vai destravar o selo "Pendente" → "Sincronizado" e o indicador em
Configurações; OCR (Fase 5) já destravou a aba "Usar câmera"; os
gráficos da Fase 6 descritos em CLAUDE.md 10.11 (linha temporal, série
por contexto, quantidade por dia/contexto) estão completos em
`/app/analises`, e o resumo pós-quarta-medição de CLAUDE.md 10.4 também
já existe em `/app` (Início); exportação (Fase 7) já destravou o CSV de `/app/relatorios`
e o JSON completo em `/app/privacidade`/Configurações — faltam apenas o
PDF e a exclusão de conta, que continua exigindo a autenticação real;
PWA/service worker (Fase 8) já destravou o modo offline real do shell
público, a página `/offline` e o aviso de atualização — falta a
Content Security Policy completa (ver `docs/privacy-and-security.md`) e
os testes cross-browser reais em dispositivo físico.
