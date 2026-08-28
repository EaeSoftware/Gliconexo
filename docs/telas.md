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

Saudação, botão grande "Registrar glicemia", card de progresso "X de 4
medições registradas" (regra real e testada em `getDashboardProgress`) e
card de "última medição" — ambos agora lêem de verdade o IndexedDB local
via `useLiveQuery` (Dexie), então a tela atualiza sozinha assim que uma
medição é criada/editada/excluída em qualquer outra aba/tela. **O que
ainda falta:** isso é só o dispositivo atual — sem sincronização com o
Supabase (Fase 4), o mesmo histórico não aparece em outro aparelho.

### `/app/registrar` — Registrar medição
**Arquivo:** `src/app/(protected)/app/registrar/page.tsx` · **Componente:** `RegisterTabs` (`src/features/measurements/components/register-tabs.tsx`) · **Status:** 🟡 Parcial

Duas abas, como pede a especificação:

- **📷 Usar câmera** — ⚪ mostra um card "chega em breve", explicando que
  por enquanto deve-se usar a entrada manual (a captura por câmera + OCR
  é Fase 5).
- **⌨️ Digitar valor** — ✅ formulário completo (`ManualEntryForm`,
  `src/features/measurements/components/manual-entry-form.tsx`): valor em
  mg/dL (validação 1–999, inteiro), data/hora pré-preenchida e editável,
  contexto (jejum, café da manhã, almoço, etc.), relação com a refeição,
  observação opcional. Ao confirmar, **salva de verdade no IndexedDB**
  (`measurementRepository.create`, via Dexie) com UUID gerado no
  cliente, e mostra uma tela de confirmação com atalhos para "Registrar
  outra" ou "Ver histórico". Ainda não sincroniza com a nuvem — o texto
  da confirmação avisa isso.

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

**O que falta:** série por contexto (café da manhã/almoço/etc. como
linhas separadas) e gráfico de "quantidade de medições por dia" ainda
não existem; filtro por contexto e "mês atual" em Análises também
ficaram fora deste incremento (o histórico já filtra por contexto).

### `/app/relatorios` — Relatórios
**Arquivo:** `src/app/(protected)/app/relatorios/page.tsx` · **Componente:** `ReportsStatus` (`src/features/measurements/components/reports-status.tsx`) · **Status:** ⚪ Placeholder (honesto sobre haver ou não dados)

Lê a contagem real de medições. Se não houver nenhuma, mostra "Nenhum
dado para exportar ainda"; se já houver medições registradas, mostra
"Exportação ainda não implementada" citando a quantidade real — em vez
de dizer "nenhum dado" quando na verdade já existem registros. A
geração de PDF/CSV em si é Fase 7.

### `/app/configuracoes` — Configurações
**Arquivo:** `src/app/(protected)/app/configuracoes/page.tsx` · **Status:** 🟡 Parcial — as únicas duas seções realmente funcionais do app protegido

- **Aparência** — ✅ `ThemeToggle` alterna de verdade entre claro/escuro/sistema, persiste em `localStorage` e evita flash incorreto no carregamento (`ThemeScript` no `<head>`).
- **Instalar aplicativo** — ✅ `InstallPwaButton` usa o evento real `beforeinstallprompt`; se o app já estiver instalado, mostra uma mensagem em vez do botão; no iOS, mostra a instrução manual de "Adicionar à Tela de Início".
- **Faixa pessoal de glicemia** — ✅ `TargetRangeForm` (`src/features/preferences/components/target-range-form.tsx`) salva mínimo/máximo de verdade no IndexedDB (`preferencesRepository`, tabela `preferences`). Validação exige os dois valores juntos (ou nenhum) e mínimo &lt; máximo (`targetRangeSchema`, testado). Assim que salva, os selos de classificação e os percentuais em Histórico/Análises passam a considerar essa faixa — sem prometer nenhuma recomendação médica, só a informação.
- **Sincronização** — ⚪ só texto explicando o que vai existir.
- **Privacidade e dados** — ⚪ botões "Exportar dados" / "Excluir conta" ficam desabilitados de propósito (`disabled`), com link para `/app/privacidade`.
- **Sobre** — ✅ mostra a versão do app e links para as políticas públicas.

### `/app/privacidade` — Central de privacidade (dentro do app)
**Arquivo:** `src/app/(protected)/app/privacidade/page.tsx` · **Status:** ⚪ Placeholder

Diferente de `/privacidade` (a política pública), esta é a tela de
**ações** do usuário sobre os próprios dados: exportar tudo, revogar
consentimento, excluir conta. Os três botões existem mas ficam
desabilitados — dependem da função server-side de exclusão de conta e da
exportação real (Fase 7 / seção 15 do `CLAUDE.md`).

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

## Como isso se encaixa nas fases do `CLAUDE.md`

Autenticação real (Fase 2) ainda destrava `/entrar`, `/cadastro`,
`/recuperar-senha` e o `TODO` de consentimento do onboarding —
bloqueada por decisão do produto até uma conta Supabase/Vercel própria
ser informada (ver `docs/database.md`). IndexedDB + repositório (Fase 3)
já destravou `/app`, `/app/registrar`, `/app/historico` e
`/app/historico/[id]`, como descrito acima. Sincronização (Fase 4)
ainda vai destravar o selo "Pendente" → "Sincronizado" e o indicador em
Configurações; OCR (Fase 5) destrava a aba "Usar câmera"; gráficos
(Fase 6) já destravaram o gráfico de linha temporal de `/app/analises`
— falta apenas a série por contexto e o gráfico de quantidade por
dia/contexto; exportação e exclusão de conta (Fase 7) destravam
`/app/relatorios` e as ações de `/app/privacidade`.
