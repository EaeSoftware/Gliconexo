# Testes — GlicoNexo

## O que existe hoje

Testes unitários com [Vitest](https://vitest.dev) + Testing Library,
configurados em `vitest.config.ts` e `tests/unit/setup.ts`.

```bash
npm run test        # roda a suíte uma vez
npm run typecheck   # tsc --noEmit
npm run lint         # ESLint (inclui regras de react-hooks)
npm run build         # build de produção (também roda checagem de tipos)
```

### Cobertura atual

| Arquivo | O que cobre |
| --- | --- |
| `tests/unit/measurement-schema.test.ts` | Validação do schema Zod de medição: limites 1–999 mg/dL, inteiro, contexto suportado, limite de observação. |
| `tests/unit/auth-schema.test.ts` | Schemas de cadastro/login: senhas coincidentes, tamanho mínimo de senha, aceite de termos obrigatório, e-mail inválido. |
| `tests/unit/dashboard-progress.test.ts` | Regra de negócio "dashboard liberado a partir da 4ª medição confirmada" (`CLAUDE.md`, seção 17, regra 3). |
| `tests/unit/theme-constants.test.ts` | Guard de tipo para a preferência de tema (`light`/`dark`/`system`). |
| `tests/unit/filter-measurements.test.ts` | Filtro por período (fixo e personalizado), contexto e origem; agrupamento por dia local. |
| `tests/unit/measurement-stats.test.ts` | Cálculo de média/mínimo/máximo/última medição a partir de uma lista de medições. |
| `tests/unit/measurement-repository.test.ts` | `MeasurementRepository` sobre IndexedDB real (via `fake-indexeddb`): criar, listar (ignorando excluídos), editar com incremento de versão, exclusão lógica e `restore`. |

Executado nesta entrega: `npm run lint`, `npm run typecheck` (via
`tsc --noEmit` e também dentro de `next build`), `npm run build` e
`npm run test` — todos passando (33 testes, 7 arquivos). Além disso, o
fluxo completo (registrar → início → histórico → análises → editar →
excluir → desfazer) foi exercitado manualmente com Playwright contra o
build de produção, sem erros de console/página — ver capturas de tela
enviadas na conversa.

## O que ainda não existe

A suíte completa descrita em `CLAUDE.md` (seção 19) depende de
funcionalidades que ainda não foram implementadas:

- **Componentes**: `ManualEntryForm`, `RegisterTabs`, `HistoryList` e
  `MeasurementDetail` já têm comportamento real (persistem no
  IndexedDB), mas ainda não têm testes de renderização/interação com
  Testing Library — só a lógica pura que eles usam
  (`filter-measurements`, `stats`, `dashboard-progress`) está coberta
  até aqui.
- **Integração**: Auth + criação de perfil, RLS entre dois usuários,
  outbox de sincronização — dependem das Fases 2 e 4. O CRUD de medição
  em si já tem cobertura via `measurement-repository.test.ts`.
- **E2E (Playwright)**: fluxo completo de cadastro → onboarding → 4
  medições → dashboard → OCR → exportação — depende das Fases 2–7.
  Nenhuma dependência de câmera física deve ser usada no CI; a fixture de
  imagem e o mock de `getUserMedia` ficam para a Fase 5.
- **Segurança**: os testes descritos em `CLAUDE.md` seção 19 (isolamento
  entre usuários, acesso anônimo, XSS em observações, vazamento em
  URLs/logs) dependem do banco e da autenticação reais.

## Convenção

- Testes unitários e de componente ficam em `tests/unit/`, espelhando a
  estrutura de `src/` quando fizer sentido.
- Preferir testar regras de negócio como funções puras (ex.:
  `getDashboardProgress`) em vez de embutir a lógica diretamente nos
  componentes de página — isso mantém os testes rápidos e sem
  dependência de ambiente de navegador.
