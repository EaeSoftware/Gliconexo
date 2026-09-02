import type { CvNamespace } from "@/features/ocr/seven-segment/types";

/**
 * Carregamento sob demanda do OpenCV.js (WASM). O `import()` só
 * acontece na primeira chamada de `loadOpenCv`, garantindo que o
 * pacote (alguns megabytes) fique num chunk separado, fora do bundle
 * principal — mesmo padrão do `tesseract.js` em `tesseract-provider.ts`.
 *
 * Ao contrário do Tesseract.js (que busca seu motor/modelos de um CDN
 * de terceiros), `@techstark/opencv-js` é um pacote npm normal: o
 * bundler do Next.js resolve e serve seu `.wasm` a partir do próprio
 * domínio da aplicação (`_next/static/...`), então o service worker já
 * o cobre via `cacheFirst()` para `/_next/static/` (ver `public/sw.js`)
 * sem precisar de nenhuma regra nova — diferente do OCR via CDN, que o
 * service worker deliberadamente não intercepta.
 */

export type { CvNamespace } from "@/features/ocr/seven-segment/types";

export type OpenCvProgress = { status: "loading" | "ready" };

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
      const cvModule = (await import("@techstark/opencv-js")) as unknown;
      const cv = await resolveCvNamespace(cvModule);
      onProgress?.({ status: "ready" });
      return cv;
    })();
  }
  return cvPromise;
}

/**
 * O pacote suporta dois formatos de inicialização dependendo da versão:
 * o módulo já é uma Promise que resolve para `cv`, ou é o próprio
 * objeto `cv` que dispara `onRuntimeInitialized` quando o WASM termina
 * de carregar. Trata os dois casos (padrão documentado do pacote). O
 * valor bruto do módulo não é tipado pelo pacote de forma confiável
 * (ver nota em `types.ts`), então é tratado como `unknown` até aqui e
 * só convertido para `CvNamespace` (nossa interface estrutural mínima)
 * no final.
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
