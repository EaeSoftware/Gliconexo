# Stack atual do GlicoNexo (levantado do repositório, não do CLAUDE.md)

> Baseado em `package.json`, `next.config.ts` e estrutura de pastas em `D:\JorgeAPP` nesta data.

## Framework e linguagem
- **Next.js 16.3.3** (App Router) com Turbopack
- **React 19.2.8** / **React DOM 19.2.8**
- **TypeScript 5** (modo estrito, `tsc --noEmit` via `npm run typecheck`)

## Estilo
- **Tailwind CSS 4** (`@tailwindcss/postcss`)
- **lucide-react** para ícones
- Não há shadcn/ui instalado ainda (CLAUDE.md sugere, mas não está no `package.json`)

## Formulários e validação
- **React Hook Form** + **@hookform/resolvers**
- **Zod 4** para schemas/validação

## Dados e persistência local
- **Dexie 4** + **dexie-react-hooks** (camada sobre IndexedDB)
- **fake-indexeddb** (apenas dev/test)

## Backend / nuvem
- **@supabase/supabase-js** e **@supabase/ssr** (Auth + Postgres)
- `supabase/migrations/` tem as 7 migrations aplicadas no projeto `nbgvlydunappunuxlbgq`, com as mesmas versões do banco (ver `docs/database.md`)

## OCR / visão computacional (a parte mais "não-padrão" da stack)
- **ppu-paddle-ocr** — motor OCR primário (PaddleOCR via WASM), adotado recentemente no lugar de outro engine (commit "Troca o motor primario de OCR para PaddleOCR")
- **onnxruntime-web** — runtime usado pelo PaddleOCR
- **tesseract.js** — ainda presente como dependência (possível fallback/legado)
- **@techstark/opencv-js** — pré-processamento de imagem (recorte, escala de cinza, binarização) e leitor customizado de display de 7 segmentos (`src/features/ocr/seven-segment/`)
- Requer alias no `next.config.ts` (`turbopack.resolveAlias`) para stubar `fs`/`path`/`crypto` no bundle client, por causa do código Emscripten do OpenCV.js

## Gráficos e relatórios
- **Recharts** para dashboards/gráficos
- **jsPDF** + **jspdf-autotable** para geração de PDF (client-side)
- CSV: não identificada lib externa (provável geração manual)

## PWA / Service Worker
- `public/sw.js` escrito à mão (não usa Serwist/Workbox/next-pwa como o CLAUDE.md sugere como opção)
- Headers de segurança básicos configurados em `next.config.ts` (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`), sem CSP completa ainda (pendência documentada no próprio arquivo)

## Testes
- **Vitest 4** (unit e integração, com config separada `vitest.integration.config.ts`)
- **Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`) + **jsdom**
- **canvas** (npm) como polyfill de canvas em testes Node
- Pastas `tests/unit` e `tests/integration` existem; **não há pasta `tests/e2e`/Playwright configurado** ainda, apesar de sugerido no CLAUDE.md

## Lint
- **ESLint 9** com `eslint-config-next`

## Estrutura de pastas (`src/`)
```
src/
  app/
  components/
  features/   (ex.: features/ocr, features/auth)
  lib/
```

## Coisas do CLAUDE.md ainda NÃO implementadas na stack real
- shadcn/ui
- TanStack Query
- Serwist (ou equivalente) para o service worker — hoje é `sw.js` manual
- Playwright (testes E2E)
- Migrations do Supabase para `profiles`, `user_preferences` e `glucose_measurements` (só `consent_records` existe aqui)
