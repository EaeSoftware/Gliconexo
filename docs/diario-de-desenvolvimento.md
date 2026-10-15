# Diário de desenvolvimento do GlicoNexo

> Escrito em primeira pessoa, do jeito que eu contaria para alguém do time como foi fazer
> este projeto: o que usei, onde travei, o que tentei e **não funcionou**, e o que eu faria
> diferente. Tudo aqui sai do histórico do Git, dos comentários do código e dos outros
> arquivos de `docs/`. Onde eu não tenho certeza de algo, eu digo.
>
> Um aviso de honestidade: parte do código foi escrita com ajuda de assistentes (sessões do
> Claude Code e do Codex). Isso aparece nos commits (`Co-Authored-By`) e no commit
> `f396a5c`, que diz "corrigidos em conjunto com o Codex". Eu não vou fingir que escrevi
> tudo sozinho.

Para os detalhes técnicos do OCR, veja também `docs/historico-correcoes.md`. Este diário é a
versão "conversa" daquele documento, com o resto da história em volta.

## 1. O que é o projeto

O GlicoNexo é um PWA para quem tem diabetes tipo 1 e usa glicosímetro de ponta de dedo: a
pessoa fotografa o visor, o app lê o número, ela confere e salva, e depois vê histórico,
gráficos e exporta PDF ou CSV. O app é só de registro e organização. Não diagnostica, não
sugere dose e não promete melhora (isso está bem marcado no `CLAUDE.md`, e eu tentei respeitar
em cada tela).

O `CLAUDE.md` foi escrito **antes** do código e é bem grande (25 seções). Ele foi o meu mapa,
mas a stack real acabou diferente da que ele sugere. Mais sobre isso abaixo.

## 2. O que eu usei

Versões tiradas do `package.json`:

| Parte | O que usei |
|---|---|
| Framework | Next.js 16.3.3 (App Router, Turbopack), React 19.2.8, TypeScript 5 |
| Estilo | Tailwind CSS 4, ícones do `lucide-react` |
| Formulários | React Hook Form + Zod 4 |
| Dados no aparelho | Dexie 4 (por cima do IndexedDB) |
| Nuvem | Supabase (`supabase-js` 2.112 e `@supabase/ssr`), só login e consentimentos por enquanto |
| OCR | `ppu-paddle-ocr` 6.4.3 (PaddleOCR, modelo PP-OCRv6 tiny) com `onnxruntime-web` |
| Gráficos | Recharts 3.10 |
| PDF | jsPDF 4.2 + jspdf-autotable 5 |
| Testes | Vitest 4, Testing Library, jsdom, `fake-indexeddb`, `canvas` (para o jsdom) |
| Service worker | Escrito à mão em `public/sw.js` |

### O que o CLAUDE.md pedia e eu **não** usei

- **TanStack Query:** não entrou. Como os dados vêm do Dexie (`useLiveQuery`) e o sync com a
  nuvem ainda não existe, não senti falta.
- **shadcn/ui:** não instalei. Os componentes são próprios, simples (`Button`, `TextField`...).
- **Serwist para o PWA:** não usei, e explico o porquê na seção 4.3.
- **Playwright como dependência:** não está no `package.json`. O `docs/testing.md` fala em
  testes de service worker feitos com Playwright, mas fora do repositório.

## 3. Linha do tempo (resumida)

| Data | O que aconteceu |
|---|---|
| 28/08/2026 | Primeiras fases: câmera + OCR com Tesseract, service worker, login. Tela em branco depois de salvar via OCR (corrigida no mesmo commit) |
| 31/08 | Número errado na câmera; menu inferior espremido |
| 02/09 | Leitor de 7 segmentos com OpenCV; briga com o Turbopack |
| 03/09 | Bugs do leitor de 7 segmentos; troca para PaddleOCR |
| 28/09 | Logo nova (e o cache que não deixava ela aparecer); exclusão de conta; merge com conflito |
| 08/10 | Gráfico por hora, fotos do visor no PDF, fim do botão de revogar consentimento |

## 4. O que tentei e não deu certo

### 4.1 O OCR (a parte que mais me custou)

Esta foi de longe a parte mais difícil. Foram **quatro abordagens** até a leitura ficar
aceitável, e a última ainda não foi testada com fotos reais no celular.

**Tentativa 1: Tesseract.js com varredura de limiar (`d004042`, 28/08).** Pré-processei a
imagem (cinza, contraste, ruído) e binarizei em três limiares (100, 130 e 160), ficando com o
resultado de maior confiança. Eu não consegui validar isso de ponta a ponta no ambiente onde
estava, porque o proxy bloqueava o CDN de onde o Tesseract baixa o modelo
(`docs/testing.md`). Ou seja, eu escrevi um pipeline que eu não tinha como ver funcionando.

**Tentativa 2: Corrigindo o "número errado" (`8eef47a`, 31/08).** Na câmera, o app pegava o
número errado. Eram duas causas:
- Eu escolhia o **primeiro** número na ordem de leitura. Um risco ou borda do visor virava um
  "dígito" solto antes do valor real e ganhava. Passei a preferir o candidato com **mais
  dígitos**.
- O Tesseract tratava o recorte como uma página inteira e quebrava o número em blocos. Resolvi
  com `PSM.SINGLE_LINE`.

**Tentativa 3: Um leitor de 7 segmentos com OpenCV (`4153f9d`, 02/09).** Visor de glicosímetro
é de 7 segmentos, e o Tesseract não gosta disso. Então escrevi um leitor próprio: detecta o
visor, corrige a perspectiva, isola o número grande, decodifica dígito por dígito e, se falhar,
cai no Tesseract. Foi bastante código (`src/features/ocr/seven-segment/`).

O que eu só descobri depois (`e71b2ee` e `f396a5c`, 03/09): esse leitor **falhava sempre, em
silêncio**. Como o fallback do Tesseract cobria, tudo parecia funcionar. Eram quatro bugs:
1. Ler os pixels de um recorte do OpenCV (`roi().clone()`) dava linhas embaralhadas, porque o
   `step` não batia com o buffer. Isso quebrava até o Tesseract.
2. Eu passava uma imagem RGBA para `findContours`, que só aceita 1 canal.
3. A polaridade do threshold estava invertida: o fundo virava primeiro plano e os dígitos
   viravam "buracos".
4. A regra de juntar fragmentos (para o "1", que vira contornos soltos) também juntava dígitos
   vizinhos.

Depois de corrigir os quatro, o leitor leu "103" numa foto **sintética**. O problema é que
sintética não é real.

**Tentativa 4: PaddleOCR (`10d4f8a`, 03/09).** Com uma **foto real com reflexo forte** no
visor, nenhum dos dois motores lia nada. Troquei para o PaddleOCR (modelo PP-OCRv6 tiny, rodando
no navegador via `onnxruntime-web`), que detecta todos os blocos de texto do visor, e passei a
escolher o principal. Ele leu "103" na foto real com confiança alta.

O PaddleOCR trouxe os próprios problemas, que fui resolvendo (`606f7a0`, 28/09):
- Ele lê **letras no lugar de dígitos**: `1O3` virava os números 1 e 3, e `1:54` virava `1S`.
  Criei `normalizeLookalikeDigits`, que troca O por 0, S por 5 etc., mas só em trechos que já
  têm algum dígito (para não estragar `mg/dL`).
- O vão entre dígitos do visor virava espaço (`1 03` virava 1 e 3). Criei a junção de grupos.
- O relógio do visor podia ganhar do valor principal. Passei a escolher o bloco **mais alto**.
- Uma leitura isolada com confiança alta ganhava de um consenso. Troquei por **votação
  ponderada** entre variantes de pré-processamento.
- A **binarização, que ajuda o decodificador de 7 segmentos, piora o PaddleOCR**. Uma rede
  neural depende dos tons de cinza dos traços. Por isso as variantes do Paddle não binarizam.

**O que ficou pela metade:** o leitor de 7 segmentos e o Tesseract **continuam no repositório e
no `package.json`**, sem ser chamados pelo app (o código foi mantido a pedido). Eles pesam na
instalação e na manutenção. Ainda não decidi o destino deles. E a v4.2 do OCR **não foi validada
com fotos reais no celular**, só com testes unitários.

### 4.2 OpenCV.js contra o Turbopack

O `@techstark/opencv-js` faz `require("fs")`, `"path"` e `"crypto"` num trecho que só roda no
Node, e o build quebrava (`b2a77c3`, 02/09). Minha primeira solução foi um `resolveAlias` no
`next.config.ts` apontando esses três módulos para um arquivo vazio.

Isso resolveu o build, mas no `dev` apareceu outro erro (`3112c33`, que eu nomeei só "ajustes
modules", o que é um péssimo nome de commit):

```
TypeError: Method Promise.prototype.then called on incompatible receiver [object Module]
```

O Turbopack tratava o `module.exports` do OpenCV (que vira uma Promise) como módulo assíncrono.
A saída foi parar de importar o OpenCV pelo bundler e servi-lo como um `<script>` estático,
copiado para `public/vendor/` por um script (`scripts/copy-opencv-asset.mjs`) que roda em
`predev` e `prebuild`.

Detalhe que me incomoda: **depois** da troca para o PaddleOCR, o OpenCV não é mais usado pelo
app, mas toda essa estrutura de build continua lá.

### 4.3 O service worker e a logo que não mudava

**Por que não usei Serwist.** O `CLAUDE.md` sugeria Serwist, mas o `@serwist/next` é baseado em
webpack e não suporta o Turbopack (o Next 16 usa Turbopack por padrão). A alternativa
(`@serwist/turbopack`) se descreve como um "workaround". Como o app lida com dado de saúde, eu
preferi um `public/sw.js` simples e auditável, escrito à mão. O preço: não existe precache com
hash gerado no build, e eu preciso **lembrar de incrementar `CACHE_VERSION` na mão** (hoje está
em `v3`). Isso está no cabeçalho do próprio `sw.js`.

**A logo que não atualizava (28/09).** Troquei a logo (`9ca7824`) e incrementei o
`CACHE_VERSION`. Não bastou: o service worker antigo, já instalado, servia `/logo/*` e
`/icons/*` em cache-first e só era trocado quando o usuário tocava em "Atualizar agora". Então a
logo antiga continuava aparecendo. Minha solução foi **renomear os arquivos com `-v2`**
(`4d65278`), gerando URLs que o cache antigo nunca viu. Isso também faz o Android atualizar o
ícone do app instalado, porque o manifest aponta para arquivos novos.

E eu errei no meio do caminho: esse commit renomeou os arquivos **sem incluir as referências
atualizadas**. Precisei de outro commit (`528efaf`) só para apontar logo, manifest e service
worker para os `-v2`. Nome de commit honesto: "completa o commit anterior".

### 4.4 Git, merge e a exclusão de conta

Em 28/09 eu fiz a mesma coisa em dois lugares ao mesmo tempo: a troca de logo e a exclusão de
conta. Na `main` entrou `POST /api/conta/excluir` (`d3feffd`), e na branch de trabalho eu tinha
feito uma versão minha, em `/api/account/delete`. O merge (`e3e4538`) deu conflito. Mantive a
versão da `main` e removi a minha rota e o componente `delete-account-button.tsx`.

Depois do merge, a rota ainda instanciava o cliente de service role direto, sem passar pelo
`src/lib/supabase/admin.ts` (que é `server-only`). O motivo, que está no corpo do commit
`6f64eda`: eu tinha editado o arquivo **depois** do `git add` e não adicionei de novo antes de
commitar. Erro de fluxo meu, simples e chato. O commit seguinte consertou.

Outro detalhe que só notei hoje, rodando a suíte: o teste dessa rota (`delete-account-route`)
**quebrava** desde essa mudança, porque `admin.ts` importa `server-only` e o teste nunca ganhou o
mock. Ninguém tinha percebido porque, na época, a suíte nem rodava (próxima seção). Corrigi com
uma linha.

Outras coisas de Git que não foram bonitas:
- Commitei um `npm-install.log` por engano (removido em `b2a77c3`).
- O `public/tmp-test/accu-chek-103.png` (a foto sintética) foi commitado e ainda está lá.
- A Fase 2 do Supabase (migrations, RLS e sessão no servidor, `a44a3d5`) foi feita numa **branch
  separada** (`claude/new-vercel-supabase-project-k30rxl`) e **nunca entrou** no histórico
  atual. Na branch de trabalho só existe a migration de consentimentos
  (`20260909000000_consent_records.sql`). Ou seja: as tabelas de perfil, preferências e medições
  do banco **não estão versionadas aqui**. Isso é pendência real.

### 4.5 O ambiente que não colaborava

Isto não é "bug do app", mas me custou tempo:
- O proxy bloqueava CDNs, então eu não conseguia baixar o modelo do Tesseract para testar.
- Em 02/09 o `npm install` só criou **stubs** em `node_modules`, e `typecheck`, `test` e `build`
  não rodavam localmente.
- Em 22/09 o `css-tree` (dependência do jsdom) estava incompleto, e o `npm test` não iniciava
  ("Failed to start forks worker"). O erro dentro do sandbox aparecia só como timeout. O contorno
  foi um config do vitest com `environment: "node"`, que só serve para testes sem DOM. Por isso
  os "52 testes de OCR" do `historico-correcoes.md` foram rodados assim.
- O disco `D:` chegou a desmontar no meio de uma sessão.
- Em **08/10** a suíte inteira rodou normalmente com a config padrão (jsdom incluso), então esse
  problema parece ter passado. Eu não sei dizer por quê, e **não rodei `npm ci`**.

### 4.6 Detalhes de interface que me deram retrabalho

- **Tela em branco depois de salvar via OCR:** a tela de confirmação dependia da URL da imagem
  temporária, e essa URL era limpa no próprio salvamento (`d004042`).
- **Login e cadastro "não faziam nada":** se o cliente Supabase não inicializava (variável de
  ambiente faltando), a exceção ficava sem tratar (`9fbb57d`). Agora mostra uma mensagem.
- **Menu inferior:** foram quatro commits seguidos para acertar: `viewport-fit=cover`, a barra de
  56 para 72 px (`83e57af`), o alinhamento do ícone e o anel do botão "Registrar", que usava a
  cor de fundo da página em vez da cor da barra e desenhava uma linha cortando o círculo
  (`d056c0d`).
- **Dados de duas contas no mesmo aparelho:** o IndexedDB tinha nome fixo. Hoje cada usuário tem
  o seu (`gliconexo-<userId>`).

## 5. O que mudou na rodada de 08/10/2026

**Gráfico por hora do dia.** Em Análises, ganhou uma seção "Glicemia por hora do dia": eixo de
0h a 23h, com a **média** de cada hora (somando todos os dias do período) e pontos vazios para o
mínimo e o máximo. Horas sem medição **ficam sem ponto**, e a linha não liga pontos através de
uma hora vazia, para não inventar dado (regra 5 do `CLAUDE.md`). Tem tabela de texto
equivalente, como os outros gráficos. O mesmo gráfico entra no PDF.

Uma decisão que eu tomei e vale discutir: a hora é lida no **fuso gravado em cada medição**
(o relógio que a pessoa via ao medir), e não no fuso atual do aparelho. O app ainda não tinha
nenhum cálculo de "hora do dia", então não havia padrão a seguir.

**Fotos do visor.** Antes, a foto era descartada depois de salvar. Agora, no registro por
câmera, existe a opção **"Guardar foto do visor neste aparelho"**, **ligada por padrão**, com o
aviso de que a foto fica só no aparelho, nunca vai a servidor e some junto com a medição.
- Guardo só o **recorte que o usuário confirmou**, reduzido (largura máxima de 640 px, JPEG),
  numa tabela própria do Dexie (`ocrImages`, versão 3 do banco). Ela fica fora de `measurements`
  para não pesar a leitura do histórico e para não entrar nos exports.
- No PDF existe a seção **"Fotos do visor (OCR)"**, que o usuário liga ou desliga ao exportar,
  com limite de 40 fotos por documento (se passar, o PDF avisa quantas ficaram de fora).
  CSV e o arquivo "todos os dados" **não** levam foto.
- Uma decisão que mudei durante a implementação: eu tinha planejado manter a foto enquanto a
  medição estivesse com o "tombstone" de exclusão. Como o app não tem purge, as fotos de
  registros excluídos ficariam para sempre no aparelho, contradizendo o texto de privacidade.
  Agora **a foto é apagada na hora em que a medição é excluída**, e o "desfazer" do histórico
  guarda a foto só em memória para regravá-la.
- Isso muda uma regra do `CLAUDE.md` (a seção 17, regra 10, só permite persistir foto com
  consentimento específico). A opção visível e desligável é a minha forma de atender isso, mas
  **o texto da política e dos termos precisa de revisão jurídica**, e eu não mudei a
  `TERMS_DOCUMENT_VERSION`.

**Fim do botão "Revogar consentimento".** Removi o botão, o card da tela de Privacidade e a
função `revokeTermsConsent`. A coluna `revoked_at` continua no banco, sem fluxo na interface.
Isso **contraria** as seções 10.3 e 15 do `CLAUDE.md`, que pedem consentimento revogável.
Hoje, a única forma de encerrar o tratamento pelo app é **Excluir conta e dados**. Isso é uma
pendência jurídica, não uma solução. O botão antigo, aliás, nem fazia muito: não pedia
confirmação e não bloqueava nada do app depois de revogar.

## 6. Ainda está pela metade

- **Sincronização com a nuvem (Fase 4):** não existe. Os dados vivem só no IndexedDB do aparelho.
  Isso também significa que as fotos do visor só existem num aparelho.
- **Tabelas do Supabase não versionadas** neste branch (seção 4.4).
- **Tesseract e OpenCV** instalados e sem uso, e o `public/tmp-test/` publicado.
- **Nenhum teste em Android ou iOS reais.** O README admite isso. A câmera, o OCR e a instalação
  do PWA foram pouco testados fora do desktop.
- **O OCR (v4.2) sem validação com fotos reais** e sem um conjunto de fotos para medir a taxa de
  acerto.
- **PaddleOCR precisa de internet no primeiro uso** (o modelo, ~6 MB, vem do Hugging Face), o que
  impede o OCR offline na primeira vez.
- **Documentação desatualizada em alguns pontos** (alguns arquivos ainda dizem que login não
  existe, por exemplo). Ajustei os que encontrei, mas não revisei tudo.
- **Pendências jurídicas e clínicas:** revisão de termos e política, a revogação de
  consentimento e a faixa pessoal (a faixa é do usuário, não recomendação do app).

## 7. O que eu faria diferente

1. **Testar com foto real desde o primeiro dia.** A foto sintética me deu falsa segurança duas
   vezes. A lição está em `docs/historico-correcoes.md`, e eu concordo com ela.
2. **Nunca deixar um fallback esconder uma falha.** O leitor de 7 segmentos "funcionou" por
   vários commits porque o Tesseract cobria. Eu deveria ter registrado qual motor produziu cada
   resultado (sem gravar o valor lido).
3. **Escolher o motor de OCR com uma foto difícil na mão** antes de escrever 500 linhas de
   OpenCV.
4. **Commits menores e com nomes honestos.** "ajustes modules" não ajuda ninguém, e o commit
   incompleto da logo me custou mais um commit.
5. **Conferir `git status` e `git diff --cached` antes de commitar.** O `6f64eda` existe por isso.
6. **Combinar com quem trabalha na `main` antes de mexer na mesma coisa.** A logo e a exclusão de
   conta foram feitas duas vezes.
7. **Manter o `npm ci` e o ambiente de teste em dia**, para a suíte não ficar quebrada sem
   ninguém ver, como aconteceu com o teste da rota de exclusão.
