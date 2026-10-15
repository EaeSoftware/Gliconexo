import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ManualEntryForm } from "@/features/measurements/components/manual-entry-form";
import { ocrImageRepository } from "@/lib/db/ocr-image-repository";
import { getDb } from "@/lib/db/schema";
import type { GlucoseMeasurement } from "@/lib/db/measurement-repository";

// O jsdom não decodifica imagens; a redução em si é só canvas, então aqui basta devolver o blob.
vi.mock("@/features/ocr/canvas-utils", () => ({
  downscaleImageBlob: vi.fn(async (blob: Blob) => blob),
}));

const photo = new Blob(["foto"], { type: "image/jpeg" });

function renderOcrForm(
  props: { onSaved?: (measurement: GlucoseMeasurement) => void; onRemoveImage?: () => void } = {},
) {
  return render(
    <ManualEntryForm
      origin="ocr"
      defaultValue="103"
      ocrConfidence={0.9}
      ocrEngineVersion="teste"
      previewImageUrl="blob:foto"
      previewImageBlob={photo}
      {...props}
    />,
  );
}

beforeEach(async () => {
  await getDb().measurements.clear();
  await getDb().ocrImages.clear();
});

describe("ManualEntryForm — foto do visor", () => {
  it("mostra a opção de guardar a foto, ligada por padrão, com o aviso de privacidade", () => {
    renderOcrForm();

    const checkbox = screen.getByRole("checkbox", { name: /guardar foto do visor neste aparelho/i });
    expect(checkbox).toBeChecked();
    expect(screen.getByText(/nunca é enviada a um servidor/i)).toBeInTheDocument();
  });

  it("não mostra a opção no registro manual", () => {
    render(<ManualEntryForm defaultValue="110" />);

    expect(screen.queryByRole("checkbox", { name: /guardar foto/i })).not.toBeInTheDocument();
  });

  it("grava a foto junto da medição quando a opção está ligada", async () => {
    const onSaved = vi.fn();
    renderOcrForm({ onSaved });

    fireEvent.click(screen.getByRole("button", { name: /confirmar e salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const measurementId = onSaved.mock.calls[0][0].id as string;
    expect(await ocrImageRepository.get(measurementId)).not.toBeNull();
  });

  it("não grava a foto quando o usuário desliga a opção", async () => {
    const onSaved = vi.fn();
    renderOcrForm({ onSaved });

    fireEvent.click(screen.getByRole("checkbox", { name: /guardar foto do visor/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirmar e salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(await getDb().ocrImages.count()).toBe(0);
    // A medição continua sendo salva normalmente, como OCR confirmado pelo usuário.
    expect(onSaved.mock.calls[0][0].source).toBe("ocr");
  });

  it("não grava foto nem mostra a opção depois de remover a imagem", async () => {
    const onSaved = vi.fn();
    renderOcrForm({ onSaved, onRemoveImage: vi.fn() });

    fireEvent.click(screen.getByRole("button", { name: /remover imagem/i }));

    expect(screen.queryByRole("checkbox", { name: /guardar foto/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirmar e salvar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(await getDb().ocrImages.count()).toBe(0);
    expect(onSaved.mock.calls[0][0].source).toBe("manual");
  });
});
