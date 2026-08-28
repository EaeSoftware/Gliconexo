export type OcrResult = {
  /** Valor numérico mais provável, ou `null` se nenhum candidato válido foi encontrado. */
  value: number | null;
  /** 0 a 1. */
  confidence: number;
  /** Outros valores numéricos plausíveis encontrados na imagem, sem o escolhido. */
  candidates: number[];
  /** Identifica a versão do mecanismo de OCR usado (registrado junto da medição). */
  engineVersion: string;
};

/**
 * Interface do provedor de OCR (CLAUDE.md, seção 6 e 10.6) — permite
 * trocar a implementação (hoje Tesseract.js) sem reescrever a tela de
 * captura.
 */
export interface OcrProvider {
  recognize(input: Blob): Promise<OcrResult>;
}
