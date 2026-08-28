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
**Arquivo:** `src/app/(protected)/app/page.tsx` · **Status:** 🟡 Parcial (UI real, dado fixo em zero)

Saudação, botão grande "Registrar glicemia", card de progresso "X de 4
medições registradas" (regra de negócio real e testada em
`getDashboardProgress`, `src/features/measurements/dashboard-progress.ts`),
card de "última medição" e atalho para o histórico. Hoje
`confirmedMeasurementsCount` está fixo em `0` no código
(`TODO (Fase 3/4)`) porque ainda não existe fonte de dados — assim que o
repositório local existir, é só trocar essa linha pela contagem real.

### `/app/registrar` — Registrar medição
**Arquivo:** `src/app/(protected)/app/registrar/page.tsx` · **Componente:** `RegisterTabs` (`src/features/measurements/components/register-tabs.tsx`) · **Status:** 🟡 Parcial

Duas abas, como pede a especificação:

- **📷 Usar câmera** — ⚪ mostra um card "chega em breve", explicando que
  por enquanto deve-se usar a entrada manual (a captura por câmera + OCR
  é Fase 5).
- **⌨️ Digitar valor** — 🟡 formulário completo (`ManualEntryForm`,
  `src/features/measurements/components/manual-entry-form.tsx`): valor em
  mg/dL (validação 1–999, inteiro), data/hora pré-preenchida e editável,
  contexto (jejum, café da manhã, almoço, etc.), relação com a refeição,
  observação opcional. Ao confirmar, mostra uma tela de confirmação com o
  valor — mas **não salva em lugar nenhum ainda**: o texto da própria
  tela avisa isso ao usuário ("o armazenamento local... será habilitado
  em uma próxima etapa"), em vez de fingir que salvou.

### `/app/historico` — Histórico
**Arquivo:** `src/app/(protected)/app/historico/page.tsx` · **Componente:** `HistoryFilters` · **Status:** 🟡 Parcial (filtros reais na UI, sem dado para filtrar)

Barra de filtros com os 4 campos da especificação (período: 7/30/90
dias/personalizado; contexto; faixa abaixo/dentro/acima; origem
manual/câmera) — os `<select>` já existem e são navegáveis, mas ainda
não filtram nada porque não há lista de medições. Abaixo, um estado
vazio real ("Nenhuma medição encontrada") com botão para ir registrar.

### `/app/historico/[id]` — Detalhe da medição
**Arquivo:** `src/app/(protected)/app/historico/[id]/page.tsx` · **Status:** ⚪ Placeholder honesto

Rota dinâmica já existe e tipa corretamente o `id` da URL, mas como não
há nenhuma fonte de dados real ainda, ela sempre chama `notFound()` —
ou seja, mostra a tela padrão "404" do Next.js em vez de fingir exibir
um registro que não existe. Vira tela de detalhe de verdade na Fase 3.

### `/app/analises` — Análises
**Arquivo:** `src/app/(protected)/app/analises/page.tsx` · **Status:** ⚪ Placeholder correto

Como o app real também mostraria (regra: gráficos só a partir da 4ª
medição confirmada), essa tela hoje sempre exibe o estado "gráficos
liberados a partir de 4 medições" com um botão para registrar. Isso é o
comportamento *correto* enquanto não há medições — não é uma
simplificação temporária, é o mesmo estado que qualquer usuário novo
veria no produto final.

### `/app/relatorios` — Relatórios
**Arquivo:** `src/app/(protected)/app/relatorios/page.tsx` · **Status:** ⚪ Placeholder

Explica o que a tela vai fazer (exportar PDF/CSV por período) e mostra
"Nenhum dado para exportar ainda". A geração de PDF/CSV em si é Fase 7.

### `/app/configuracoes` — Configurações
**Arquivo:** `src/app/(protected)/app/configuracoes/page.tsx` · **Status:** 🟡 Parcial — as únicas duas seções realmente funcionais do app protegido

- **Aparência** — ✅ `ThemeToggle` alterna de verdade entre claro/escuro/sistema, persiste em `localStorage` e evita flash incorreto no carregamento (`ThemeScript` no `<head>`).
- **Instalar aplicativo** — ✅ `InstallPwaButton` usa o evento real `beforeinstallprompt`; se o app já estiver instalado, mostra uma mensagem em vez do botão; no iOS, mostra a instrução manual de "Adicionar à Tela de Início".
- **Faixa pessoal de glicemia** — ⚪ só texto explicando o que vai existir.
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
| `ConnectionStatus` | `src/components/layout/connection-status.tsx` | Badge Online/Offline em tempo real. |
| `Sidebar` / `BottomNav` | `src/components/layout/` | Navegação do app protegido, adaptada por breakpoint. |

## Como isso se encaixa nas fases do `CLAUDE.md`

As colunas 🟡/⚪ acima devem virar ✅ conforme as fases do plano (seção 21)
forem implementadas: autenticação real (Fase 2) destrava `/entrar`,
`/cadastro`, `/recuperar-senha` e o `TODO` de consentimento do
onboarding; IndexedDB + repositório (Fase 3) destrava
`/app`, `/app/registrar`, `/app/historico` e `/app/historico/[id]`;
sincronização (Fase 4) destrava o indicador de sincronização em
Configurações; OCR (Fase 5) destrava a aba "Usar câmera"; gráficos
(Fase 6) destravam `/app/analises`; exportação e exclusão de conta
(Fase 7) destravam `/app/relatorios` e as ações de `/app/privacidade`.
