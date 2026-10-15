import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MeasurementPhoto } from "@/features/measurements/components/measurement-photo";
import { ocrImageRepository } from "@/lib/db/ocr-image-repository";
import { getDb } from "@/lib/db/schema";

// O fake-indexeddb não preserva o Blob real, então a leitura para data URL é simulada.
vi.mock("@/lib/export/blob-to-data-url", () => ({
  blobToDataUrl: vi.fn(async () => "data:image/jpeg;base64,AAAA"),
}));

beforeEach(async () => {
  await getDb().ocrImages.clear();
});

describe("MeasurementPhoto", () => {
  it("não mostra nada quando a medição não tem foto", async () => {
    const { container } = render(<MeasurementPhoto measurementId="sem-foto" />);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a foto guardada e remove só depois de confirmar", async () => {
    await ocrImageRepository.save("m1", new Blob(["foto"], { type: "image/jpeg" }));
    render(<MeasurementPhoto measurementId="m1" />);

    const image = await screen.findByRole("img", { name: /foto do visor/i });
    expect(image).toHaveAttribute("src", "data:image/jpeg;base64,AAAA");

    fireEvent.click(screen.getByRole("button", { name: /remover foto/i }));
    // Pediu confirmação: nada foi apagado ainda.
    expect(await ocrImageRepository.get("m1")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /confirmar remoção/i }));

    await waitFor(async () => expect(await ocrImageRepository.get("m1")).toBeNull());
    await waitFor(() => expect(screen.queryByRole("img")).not.toBeInTheDocument());
  });

  it("cancelar a remoção mantém a foto", async () => {
    await ocrImageRepository.save("m2", new Blob(["foto"], { type: "image/jpeg" }));
    render(<MeasurementPhoto measurementId="m2" />);

    await screen.findByRole("img", { name: /foto do visor/i });
    fireEvent.click(screen.getByRole("button", { name: /remover foto/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(await ocrImageRepository.get("m2")).not.toBeNull();
    expect(screen.getByRole("button", { name: /remover foto/i })).toBeInTheDocument();
  });
});
