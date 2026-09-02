export type ExportableFile = {
  content: BlobPart;
  filename: string;
  mimeType: string;
};

export type ShareOrDownloadResult = "shared" | "downloaded" | "cancelled";

/**
 * Compartilha ou baixa um arquivo gerado no cliente, com cuidado para
 * não conflitar com funções nativas do Android/iOS nem com a interface
 * do app (nunca usa `window.open`, nunca abre elementos fixos por cima
 * da navegação):
 *
 * - Quando a Web Share API com arquivos está disponível, tenta abrir a
 *   folha de compartilhamento nativa. Se o usuário cancelar
 *   (`AbortError`), a função para ali — nunca dispara um download
 *   automático depois de um cancelamento explícito.
 * - Caso contrário (ou se o compartilhamento falhar por outro motivo),
 *   cai para um download comum via link temporário (`<a download>`),
 *   que funciona de forma previsível tanto no Android quanto no iOS.
 */
export async function shareOrDownloadFile(
  file: ExportableFile,
  shareOptions: { title?: string; text?: string } = {},
): Promise<ShareOrDownloadResult> {
  const blob = new Blob([file.content], { type: file.mimeType });

  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    try {
      const nativeFile = new File([blob], file.filename, { type: file.mimeType });
      if (navigator.canShare({ files: [nativeFile] })) {
        await navigator.share({ files: [nativeFile], ...shareOptions });
        return "shared";
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Qualquer outro erro de compartilhamento cai para o download abaixo.
    }
  }

  downloadBlob(blob, file.filename);
  return "downloaded";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  // Precisa estar no DOM para o clique funcionar em todos os navegadores.
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoga a URL depois de um instante, dando tempo do navegador iniciar o download.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function canShareFiles(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.share) && Boolean(navigator.canShare);
}
