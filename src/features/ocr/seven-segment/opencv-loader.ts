import type { CvNamespace } from "@/features/ocr/seven-segment/types";

/**
 * Carregamento sob demanda do OpenCV.js (WASM) via tag `<script>`
 * estática, servida de `/vendor/opencv.js` (gerado a partir de
 * `node_modules/@techstark/opencv-js` por `scripts/copy-opencv-asset.mjs`,
 * rodado em `predev`/`prebuild`) — não por `import()` dinâmico.
 *
 * Por quê não `import()`: o build do pacote (`dist/opencv.js`) é um
 * UMD cujo `module.exports` final é a própria Promise retornada pela
 * factory assíncrona do Emscripten (`cv(Module)`), não um objeto com
 * propriedade `default`. O Turbopack (Next 16, dev) interpreta um CJS
 * cujo `module.exports` resolvido é uma Promise como "async module" e
 * tenta adotá-la — mas entrega um Module namespace object (exótico,
 * sem os internal slots de Promise) onde esse protocolo espera um
 * thenable real, o que lança `TypeError: Method Promise.prototype.then
 * called on incompatible receiver [object Module]` antes mesmo do
 * nosso código rodar. Carregar via `<script>` bypassa o sistema de
 * módulos do bundler inteiramente para este pacote — o mesmo problema
 * não existe em `window.cv` lido depois do `load` do script.
 *
 * O WASM vem embutido em base64 dentro do próprio `.js` (build
 * `SINGLE_FILE` do Emscripten — não há `.wasm` separado no pacote), e
 * o service worker cobre `/vendor/opencv.js` via `cacheFirst()` (ver
 * `public/sw.js`, mesma regra de assets estáticos versionados).
 */

export type { CvNamespace } from "@/features/ocr/seven-segment/types";

export type OpenCvProgress = { status: "loading" | "ready" };

const OPENCV_SCRIPT_URL = "/vendor/opencv.js";
const OPENCV_SCRIPT_MARKER = "data-opencv-loader";

let cvPromise: Promise<CvNamespace> | null = null;

/**
 * Resolve para o namespace `cv` pronto para uso. Chamadas subsequentes
 * reaproveitam a mesma promessa (singleton) — o runtime WASM não
 * precisa (nem deve) ser recarregado a cada foto.
 */
export function loadOpenCv(onProgress?: (progress: OpenCvProgress) => void): Promise<CvNamespace> {
  if (!cvPromise) {
    onProgress?.({ status: "loading" });
    cvPromise = (async () => {
      const rawCv = await loadOpenCvScript();
      const cv = await resolveCvNamespace(rawCv);
      onProgress?.({ status: "ready" });
      return cv;
    })();
  }
  return cvPromise;
}

/** Injeta (ou reaproveita) a tag `<script>` e resolve para `window.cv` assim que ela carrega. */
function loadOpenCvScript(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[${OPENCV_SCRIPT_MARKER}]`);
    if (existing) {
      if ((window as unknown as { cv?: unknown }).cv !== undefined) {
        resolve((window as unknown as { cv?: unknown }).cv);
        return;
      }
      existing.addEventListener("load", () => resolve((window as unknown as { cv?: unknown }).cv));
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar OpenCV.js")));
      return;
    }

    const script = document.createElement("script");
    script.src = OPENCV_SCRIPT_URL;
    script.async = true;
    script.setAttribute(OPENCV_SCRIPT_MARKER, "true");
    script.addEventListener("load", () => resolve((window as unknown as { cv?: unknown }).cv));
    script.addEventListener("error", () => reject(new Error("Falha ao carregar OpenCV.js")));
    document.head.appendChild(script);
  });
}

/**
 * O pacote suporta dois formatos de inicialização dependendo da versão:
 * o módulo já é uma Promise que resolve para `cv`, ou é o próprio
 * objeto `cv` que dispara `onRuntimeInitialized` quando o WASM termina
 * de carregar. Trata os dois casos (padrão documentado do pacote). O
 * valor bruto não é tipado de forma confiável (ver nota em
 * `types.ts`), então é tratado como `unknown` até aqui e só convertido
 * para `CvNamespace` (nossa interface estrutural mínima) no final.
 */
async function resolveCvNamespace(cvModule: unknown): Promise<CvNamespace> {
  const candidate = isRecord(cvModule) && "default" in cvModule ? cvModule.default : cvModule;

  if (candidate instanceof Promise) {
    return (await candidate) as CvNamespace;
  }

  if (isRecord(candidate) && "Mat" in candidate) {
    return candidate as unknown as CvNamespace;
  }

  if (isRecord(candidate)) {
    await new Promise<void>((resolve) => {
      (candidate as Record<string, unknown>).onRuntimeInitialized = () => resolve();
    });
    return candidate as unknown as CvNamespace;
  }

  throw new Error("Formato inesperado do módulo @techstark/opencv-js");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
