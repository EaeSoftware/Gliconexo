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
| `tests/unit/filter-measurements.test.ts` | Filtro por período (fixo e personalizado), contexto, origem e faixa; agrupamento por dia local. |
| `tests/unit/measurement-stats.test.ts` | Cálculo de média/mínimo/máximo/última medição e distribuição percentual abaixo/dentro/acima da faixa. |
| `tests/unit/classify.test.ts` | Classificação de um valor em relação à faixa pessoal (`null` sem faixa configurada, limites inclusivos). |
| `tests/unit/target-range-schema.test.ts` | Schema Zod da faixa pessoal: os dois valores juntos ou nenhum, mínimo &lt; máximo, intervalo 1–999. |
| `tests/unit/measurement-repository.test.ts` | `MeasurementRepository` sobre IndexedDB real (via `fake-indexeddb`): criar, listar (ignorando excluídos), editar com incremento de versão, exclusão lógica e `restore`. |
| `tests/unit/preferences-repository.test.ts` | `preferencesRepository` sobre IndexedDB real: salvar, recuperar e sobrescrever a faixa pessoal. |
| `tests/unit/csv.test.ts` | Geração do CSV de medições: cabeçalho em português, ordenação, observação omitida por padrão, escape de vírgula/aspas/quebra de linha. |
| `tests/unit/export-all-data.test.ts` | Formato do export completo (JSON): exclui medições excluídas logicamente, inclui/omite a faixa pessoal corretamente. |
| `tests/unit/pluralize.test.ts` | `formatMeasurementCount`: concordância singular/plural de "medição(ões)", com e sem "confirmada(s)" — criada depois de um bug real de concordância aparecer em produção. |
| `tests/unit/ocr-parse-candidates.test.ts` | `parseNumericCandidates`/`pickBestCandidate`: extração de números de 1–999 do texto bruto do OCR, rejeição de texto sem dígitos, desduplicação e escolha do primeiro candidato válido. |
| `tests/unit/ocr-preprocess.test.ts` | Pipeline de pré-processamento de imagem (`toGrayscale`, `adjustContrast`, `denoise`, `threshold`, `preprocessForThreshold`) como funções puras sobre um buffer de pixels compatível com `ImageData`, sem depender de `<canvas>` real. |

Executado nesta entrega: `npm run lint`, `npm run typecheck` (via
`tsc --noEmit` e também dentro de `next build`), `npm run build` e
`npm run test` — todos passando (87 testes, 15 arquivos). Além disso, os
fluxos completos (registrar → início → histórico → análises → editar →
excluir → desfazer; configurar faixa → ver classificação → filtrar por
faixa → ver percentuais em análises; o gráfico de linha temporal com e
sem faixa configurada, incluindo a tabela textual acessível e o filtro
de período; a exportação de CSV/JSON, incluindo o conteúdo do arquivo
baixado e a posição dos botões em relação à barra de navegação; e a
captura por câmera — permissão, moldura, recorte, giro, fallback para
seleção de arquivo, confirmação obrigatória e o fluxo de "tentar
novamente" — foram exercitados manualmente com Playwright contra o
build de produção, incluindo o Chromium com
`--use-fake-device-for-media-stream`/`--use-fake-ui-for-media-stream`
para simular a câmera sem hardware real, sem erros de console/página.
**Limitação do ambiente de teste:** o proxy de rede desta sessão bloqueia
o CDN público do Tesseract.js (`cdn.jsdelivr.net`), então o
reconhecimento de dígitos em si (o resultado numérico do OCR) não pôde
ser verificado ponta a ponta nesta sandbox — apenas o fluxo ao redor
(captura, recorte, giro, estado de carregamento e a obrigatoriedade de
confirmação/edição do valor) foi confirmado. Ver "OCR e conectividade"
em `docs/telas.md` e "Câmera e OCR" em `docs/architecture.md`.

O **service worker** (`public/sw.js`, Fase 8) não tem testes unitários
próprios: `jsdom`/Vitest não implementam a API real de Service Worker
(`self`, `caches`, `ServiceWorkerGlobalScope`), então testar suas
estratégias de cache exige um navegador de verdade. A verificação foi
feita com Playwright contra o build de produção: registro/ativação do
worker; uma página pública já visitada continuando a responder com o
servidor de produção genuinamente derrubado (não uma emulação de rede);
uma rota protegida nunca visitada mostrando a página `/offline` na
mesma condição, sem vazar HTML autenticado antigo; e, simulando uma
nova versão do arquivo, o aviso "nova versão disponível" aparecendo sem
sobrepor a barra de navegação inferior (390px/320px) e o botão
"Atualizar agora" trocando o controlador da página de fato. Detalhe de
por que a verificação usou uma queda real do servidor em vez de
`context.setOffline()`/`context.route()` do Playwright (que não
interceptam de forma confiável requisições originadas de dentro do
próprio service worker) em "Service worker e cache",
`docs/architecture.md`.

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
  medições → dashboard → OCR → exportação — depende das Fases 2 e 4
  (autenticação e sincronização) para existir como uma suíte automatizada
  no CI; até lá, a verificação do fluxo de câmera/OCR foi feita
  manualmente contra o build de produção (ver acima). Nenhuma dependência
  de câmera física é usada — o Chromium é aberto com flags de dispositivo
  de mídia falso.
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
