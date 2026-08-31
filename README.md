# GlicoNexo

GlicoNexo é uma aplicação web progressiva (PWA), mobile-first, para apoiar o
autogerenciamento glicêmico de pessoas com Diabetes Mellitus Tipo 1 que usam
glicosímetro capilar convencional.

O produto permite fotografar o visor do glicosímetro e extrair o valor por
OCR (com confirmação obrigatória do usuário), registrar medições
manualmente, consultar histórico e indicadores, funcionar offline e
exportar dados em PDF/CSV.

> O GlicoNexo é uma ferramenta de registro, organização e visualização de
> dados. Ele **não diagnostica**, **não prescreve tratamento** e **não
> substitui** o acompanhamento com um profissional de saúde.

A especificação completa do produto está em [`CLAUDE.md`](./CLAUDE.md).

## Status atual do desenvolvimento

Esta entrega cobre a **Fase 0 (auditoria)**, a **Fase 1 (base do
projeto)**, boa parte da **Fase 3 (registro manual e histórico)**, a
**Fase 5 (câmera e OCR)**, a **Fase 6 completa (dashboard e gráficos)**,
a exportação de dados (CSV/JSON) da **Fase 7 (relatórios e
privacidade)**, e boa parte da **Fase 8 (PWA e endurecimento)** do plano
descrito em `CLAUDE.md`, seção 21:

- ✅ Scaffold Next.js (App Router) + TypeScript estrito + Tailwind CSS v4.
- ✅ Identidade visual GlicoNexo (logo, ícones PWA, paleta, tema claro/escuro/sistema).
- ✅ Rotas públicas: página inicial, entrar, cadastro, recuperar senha, privacidade, termos.
- ✅ Onboarding (4 passos) e casca do app protegido (`/app/*`) com navegação inferior (mobile) e sidebar (desktop).
- ✅ Cliente Supabase (browser e servidor) preparado para autenticação — **ainda não conectado a um projeto Supabase real** (pendência de produto, ver abaixo).
- ✅ Manifest da PWA, ícones e botão de instalação.
- ✅ **Persistência local real (IndexedDB via Dexie):** registrar, editar,
  excluir (com "desfazer") e listar/filtrar medições já funciona de
  ponta a ponta, salvando no navegador. `Início`, `Histórico`,
  `Histórico/[id]` e o resumo numérico de `Análises` já usam esses dados
  reais — ver [`docs/telas.md`](./docs/telas.md) para o detalhe tela a
  tela.
- ✅ **Faixa pessoal de glicemia** configurável em Configurações, também
  salva localmente: quando configurada, o histórico e as análises
  passam a classificar cada medição como abaixo/dentro/acima da faixa
  (texto + ícone, nunca só cor) e a mostrar os percentuais reais — sem
  faixa configurada, nada é classificado (CLAUDE.md, seção 17, regra 8).
- ✅ **Os três gráficos de Análises** (Recharts, carregados sob demanda):
  linha temporal com faixas de referência e filtro de período; série por
  contexto (café da manhã/almoço/lanche da tarde/jantar/outros, uma
  cor validada por balde — nunca confundível com as cores de status);
  e quantidade de medições por dia e contexto (barras empilhadas). Os
  três têm tabela textual acessível equivalente (`<details>`, para
  navegação por teclado/leitor de tela) e nenhum interpola dias sem
  dados nem projeta tendência. A partir da quarta medição, um resumo
  equivalente (média/mínimo/máximo/registros/distribuição + o gráfico de
  linha) também aparece na Início, como pede CLAUDE.md 10.4.
- ✅ **Exportação de dados**, com cuidado para não conflitar com
  funções nativas do Android/iOS: em Relatórios, um CSV real das
  medições (período, observações opcionais, cabeçalhos em português,
  ISO + horário local, escape correto); em Configurações/Privacidade,
  um JSON com todos os dados locais. Os dois usam a Web Share API
  quando disponível (com fallback para download comum) e nunca
  `window.open` nem elementos fixos que possam cobrir a navegação —
  ver "Exportação e compartilhamento no mobile" em `docs/telas.md`.
- ✅ **Captura por câmera e OCR (Tesseract.js)**: fotografar o visor do
  glicosímetro (ou escolher uma imagem existente, com fallback via
  `<input capture="environment">` quando `getUserMedia` não está
  disponível), recortar e girar a foto, rodar o reconhecimento de
  dígitos inteiramente no navegador (testando vários níveis de limiar
  de binarização) e exigir confirmação/edição do valor antes de
  salvar — a foto nunca é enviada a um servidor nem persistida, só
  existe como URL temporária revogada ao final. Uma falha de OCR nunca
  bloqueia a digitação manual (`src/features/ocr/`) — ver "Câmera e
  OCR e conectividade" em `docs/telas.md`.
- ✅ **Service worker real e modo offline** (`public/sw.js`, escrito à
  mão — ver "Sobre o service worker" abaixo): cache-first para ícones e
  assets versionados, stale-while-revalidate para as páginas públicas,
  e **rede apenas (nunca cache) para `/app/*`**, para nunca guardar
  dados de saúde autenticados no service worker. Página `/offline`
  quando uma navegação falha sem nada em cache, e um aviso "nova versão
  disponível" que só troca de versão quando o usuário confirma. Também
  nesta entrega: cabeçalhos de segurança básicos (`X-Content-Type-
  Options`, `Referrer-Policy`, `Permissions-Policy`) em
  `next.config.ts`.
- ✅ Testes unitários (Vitest) para os schemas Zod, a regra das quatro
  medições, os filtros/agrupamento/classificação de histórico, a
  geração de CSV, os repositórios IndexedDB (com `fake-indexeddb`), o
  parser de candidatos numéricos do OCR, o pipeline de
  pré-processamento de imagem e a preparação dos dados dos gráficos por
  contexto — 96 testes, todos passando. O service worker e os gráficos
  Recharts foram verificados manualmente com Playwright (sem testes
  unitários para eles, por não haver como emular a API real de Service
  Worker em `jsdom`, e por serem visuais) — ver `docs/testing.md`.

**Ainda não implementado** (fases seguintes do `CLAUDE.md`, seção 21):

- Banco de dados remoto, migrations, RLS e autenticação real (Fase 2) —
  **bloqueado por decisão de produto**: será usada uma conta
  Supabase/Vercel própria, ainda não criada/informada (ver "Configurar o
  Supabase" abaixo).
- Fila de sincronização offline↔nuvem (Fase 4) — por isso todo registro
  aparece com o selo "Pendente" no histórico, e os dados não saem do
  dispositivo atual.
- Geração de PDF e exclusão de conta (o resto da Fase 7 — CSV e JSON já
  existem, ver acima). Exclusão de conta depende da autenticação real.
- Content Security Policy completa e testes cross-browser em dispositivo
  físico (o resto da Fase 8 — service worker e headers básicos já
  existem, ver acima).

Os pontos pendentes estão marcados com `TODO (Fase N)` no código onde
fizer sentido, e documentados tela a tela em
[`docs/telas.md`](./docs/telas.md).

## Como rodar localmente

Pré-requisitos: Node.js 20.9+ e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Scripts disponíveis

```bash
npm run dev        # servidor de desenvolvimento (Turbopack)
npm run build       # build de produção
npm run start       # servidor de produção (após build)
npm run lint         # ESLint
npm run typecheck  # checagem de tipos (tsc --noEmit)
npm run test         # testes unitários (Vitest)
```

## Documentação de cada tela

Para saber exatamente o que cada tela faz hoje — o que já é real e o que
ainda é placeholder — veja [`docs/telas.md`](./docs/telas.md).

## Configurar o Supabase

> **Pendência registrada (decisão do responsável pelo produto, 2026-08-28):**
> o projeto será conectado a uma conta **Supabase e Vercel própria**, ainda
> a ser criada/informada pelo responsável pelo produto. Nenhum projeto
> Supabase existente deve ser reaproveitado para o GlicoNexo. Até lá, a
> Fase 2 (banco + autenticação real) fica bloqueada — o app roda apenas
> com dados locais (ver `docs/database.md`).

O projeto ainda **não está conectado a um projeto Supabase real**. Quando o
projeto for criado (Fase 2):

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Copie a URL e a chave anônima (`anon key`) para `.env.local`, usando
   `.env.example` como referência:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta ao navegador — use
   apenas em código server-side ou em Edge Functions.
4. Migrations versionadas viverão em `supabase/migrations/` (a criar na
   Fase 2, junto com as políticas de Row Level Security).

## Testar como PWA e modo offline

1. Rode `npm run build && npm run start` (o modo `dev` não reflete o
   comportamento final de instalação — o service worker só se registra
   em produção, de propósito, para não brigar com o hot reload).
2. Abra o app no Chrome/Edge e use as ferramentas de desenvolvedor
   (Application → Manifest) para conferir o `manifest.webmanifest`
   gerado em `/manifest.webmanifest`, e (Application → Service Workers)
   para conferir que `sw.js` está registrado e ativo.
3. Um botão de instalação está disponível em **Configurações → Instalar
   aplicativo**, usando o evento `beforeinstallprompt`.
4. Para testar offline de verdade: navegue por algumas páginas públicas
   (landing, entrar, cadastro) para que o service worker as guarde em
   cache, depois pare o servidor (`Ctrl+C` no terminal do `npm run
   start`) e recarregue — essas páginas continuam abrindo. Uma rota
   protegida (`/app/*`) nunca visitada antes, na mesma condição, mostra
   a página `/offline` em vez de um erro do navegador (dados
   autenticados nunca ficam em cache, de propósito — ver
   `docs/privacy-and-security.md`).
5. **Importante:** o service worker cobre o shell público e os assets
   estáticos, mas ainda não existe uma Content Security Policy completa
   nem testes em dispositivo físico (Android/iOS) — só verificado com
   Chromium via Playwright até aqui. Ver "Limitações e pendências
   conhecidas" abaixo.

## Estrutura do projeto

```text
src/
  app/
    (public)/          rotas públicas: landing, entrar, cadastro, recuperar-senha, privacidade, termos
    (protected)/app/    rotas autenticadas: início, registrar, histórico, análises, relatórios, configurações, privacidade
    onboarding/         fluxo de 4 passos pós-cadastro
    offline/              página offline (fallback do service worker)
    manifest.ts         manifest da PWA
  components/
    ui/                 primitivos (Button, TextField, Logo)
    layout/             Sidebar, BottomNav, ConnectionStatus
    theme/               tema claro/escuro/sistema
    pwa/                  InstallPwaButton, UpdateAvailableBanner
    auth/, legal/, feedback/
  features/
    auth/                schemas e formulários de autenticação
    measurements/       schemas, componentes, filtros/estatísticas puras (testados)
    ocr/                  câmera, recorte, pré-processamento e OcrProvider (Tesseract.js)
    onboarding/           conteúdo dos 4 passos
    navigation/         itens do menu
  lib/
    supabase/            clientes Supabase (browser/servidor)
    db/                  IndexedDB local (Dexie): schema + MeasurementRepository
    theme/, offline/, pwa/  hooks utilitários (tema, online/offline, service worker)
public/
  icons/                ícones da PWA (192, 512, maskable, apple-touch)
  logo/                 logo GlicoNexo em SVG
  sw.js                  service worker (cache, offline, atualização controlada)
tests/
  unit/                 testes Vitest
docs/
  architecture.md, database.md, privacy-and-security.md, testing.md
```

## Sobre a logo

A logo usada neste projeto (`public/logo/`) é uma recriação em SVG feita a
partir da imagem enviada pelo responsável pelo produto, preservando cores,
proporções e composição (gota + molécula + "GlicoNexo"). Se houver um
arquivo-fonte oficial (AI, Figma, SVG ou PNG em alta resolução), ele deve
substituir os arquivos em `public/logo/` e os ícones em `public/icons/`
para garantir fidelidade total à marca.

## Limitações e pendências conhecidas

- **Pendência de decisão do produto:** conta Supabase/Vercel dedicada ao
  GlicoNexo ainda não foi criada/informada — ver aviso em "Configurar o
  Supabase" acima. Nenhuma autenticação real está ativa: os formulários
  de entrar/cadastro chamam o SDK do Supabase, mas falharão graciosamente
  até haver um projeto configurado.
- Medições já são persistidas de verdade, mas **só neste dispositivo**:
  não há sincronização com nuvem, escopo por usuário nem limpeza no
  logout (não existe logout real ainda).
- O service worker cobre o shell público e os assets estáticos, mas uma
  primeira visita **totalmente** offline (nunca abriu o app neste
  dispositivo antes) não tem nada em cache para mostrar — limitação
  inerente a qualquer PWA. O motor de OCR também exige internet na
  primeira vez que a câmera é usada em cada dispositivo.
- Não existe uma Content Security Policy completa ainda (só os
  cabeçalhos de segurança básicos) — ver `docs/privacy-and-security.md`
  para o porquê disso ter sido adiado de propósito.
- O PWA/service worker só foi verificado com Chromium via Playwright
  contra o build de produção — ainda faltam testes em dispositivo físico
  Android/iOS.
- Textos de privacidade e termos são rascunhos e estão marcados como
  pendentes de revisão jurídica.
- Nenhuma validação clínica, jurídica ou de usabilidade foi realizada.
