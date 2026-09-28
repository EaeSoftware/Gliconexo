import {
  denoise,
  flattenIllumination,
  invert,
  meanLuminance,
  sharpen,
  stretchContrast,
  toGrayscale,
} from "@/features/ocr/preprocess";
import type { PreprocessVariant } from "@/features/ocr/run-ocr-pipeline";

/** Abaixo desta luminância média, a foto provavelmente é de um visor com luz de fundo (dígito claro sobre fundo escuro). */
const DARK_DISPLAY_LUMINANCE = 100;

/**
 * Variantes de pré-processamento tentadas em sequência contra o
 * PaddleOCR (CLAUDE.md, seção 10.6: "testar variacoes de limiar e
 * selecionar o candidato mais consistente"). Deliberadamente sem
 * binarização (`threshold`): PaddleOCR é uma rede de detecção de texto
 * genérica que depende do antialiasing dos traços — um limiar binário
 * (bom para o leitor de 7 segmentos) tende a piorar o reconhecimento
 * aqui.
 *
 * Ordem pensada para o caso comum parar cedo: "original" mantém o
 * comportamento atual quando a foto já está nítida; "flatten-illumination"
 * vem em seguida porque reflexo no visor foi a falha real mais frequente;
 * "inverted" só roda em fotos escuras (visores com luz de fundo).
 */
export const PADDLE_PREPROCESS_VARIANTS: PreprocessVariant[] = [
  { name: "original", apply: (buffer) => buffer },
  {
    name: "flatten-illumination",
    apply: (buffer) => stretchContrast(flattenIllumination(buffer)),
  },
  {
    name: "stretch-sharpen",
    apply: (buffer) => sharpen(stretchContrast(toGrayscale(buffer))),
  },
  {
    name: "denoise-stretch",
    apply: (buffer) => stretchContrast(denoise(toGrayscale(buffer))),
  },
  {
    name: "inverted",
    when: (buffer) => meanLuminance(buffer) < DARK_DISPLAY_LUMINANCE,
    apply: (buffer) => invert(stretchContrast(toGrayscale(buffer))),
  },
];
