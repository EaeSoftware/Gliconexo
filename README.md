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

Esta primeira entrega cobre a **Fase 0 (auditoria)** e a **Fase 1 (base do
projeto)** do plano descrito em `CLAUDE.md`, seção 21:

- ✅ Scaffold Next.js (App Router) + TypeScript estrito + Tailwind CSS v4.
- ✅ Identidade visual GlicoNexo (logo, ícones PWA, paleta, tema claro/escuro/sistema).
- ✅ Rotas públicas: página inicial, entrar, cadastro, recuperar senha, privacidade, termos.
- ✅ Onboarding (4 passos) e casca do app protegido (`/app/*`) com navegação inferior (mobile) e sidebar (desktop).
- ✅ Formulário de registro manual de medição, com validação Zod compartilhável entre OCR e manual.
- ✅ Cliente Supabase (browser e servidor) preparado para autenticação — **ainda não conectado a um projeto Supabase real**.
- ✅ Manifest da PWA, ícones e botão de instalação.
- ✅ Testes unitários (Vitest) para os schemas Zod e para a regra das quatro medições.

**Ainda não implementado** (fases seguintes do `CLAUDE.md`, seção 21):

- Banco de dados, migrations, RLS e autenticação real (Fase 2).
- Persistência local (IndexedDB/Dexie), fila de sincronização offline e CRUD de medições (Fase 3–4).
- Captura por câmera e OCR (Tesseract.js) (Fase 5).
- Gráficos e indicadores do dashboard (Fase 6).
- Geração de PDF/CSV e exclusão de conta (Fase 7).
- Service worker com estratégia de cache e testes cross-browser (Fase 8).

As telas do app protegido (histórico, análises, relatórios, configurações)
já existem com layout, filtros e estados vazios reais, mas ainda sem dados
persistidos — os pontos pendentes estão marcados com `TODO (Fase N)` no
código.

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
   comportamento final de instalação).
2. Abra o app no Chrome/Edge e use as ferramentas de desenvolvedor
   (Application → Manifest) para conferir o `manifest.webmanifest` gerado
   em `/manifest.webmanifest`.
3. Um botão de instalação está disponível em **Configurações → Instalar
   aplicativo**, usando o evento `beforeinstallprompt`.
4. **Importante:** esta entrega ainda não inclui um service worker com
   estratégia de cache (Fase 8 do `CLAUDE.md`). Isso significa que o app
   ainda não funciona de fato offline nem é instalável de forma completa
   em todos os navegadores — apenas o manifest e os ícones estão prontos.

## Estrutura do projeto

```text
src/
  app/
    (public)/          rotas públicas: landing, entrar, cadastro, recuperar-senha, privacidade, termos
    (protected)/app/    rotas autenticadas: início, registrar, histórico, análises, relatórios, configurações, privacidade
    onboarding/         fluxo de 4 passos pós-cadastro
    manifest.ts         manifest da PWA
  components/
    ui/                 primitivos (Button, TextField, Logo)
    layout/             Sidebar, BottomNav, ConnectionStatus
    theme/               tema claro/escuro/sistema
    auth/, legal/, feedback/, pwa/
  features/
    auth/                schemas e formulários de autenticação
    measurements/       schemas, constantes e formulário de registro manual
    onboarding/           conteúdo dos 4 passos
    navigation/         itens do menu
  lib/
    supabase/            clientes Supabase (browser/servidor)
    theme/, offline/, pwa/  hooks utilitários
public/
  icons/                ícones da PWA (192, 512, maskable, apple-touch)
  logo/                 logo GlicoNexo em SVG
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

- Nenhuma autenticação real está ativa: os formulários de entrar/cadastro
  chamam o SDK do Supabase, mas falharão graciosamente até haver um
  projeto Supabase configurado.
- Nenhum dado é persistido ainda (sem IndexedDB nem banco remoto).
- Não há service worker/offline real, apenas o manifest da PWA.
- Textos de privacidade e termos são rascunhos e estão marcados como
  pendentes de revisão jurídica.
- Nenhuma validação clínica, jurídica ou de usabilidade foi realizada.
