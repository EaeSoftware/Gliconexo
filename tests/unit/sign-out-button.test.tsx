import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getLocalDataSummary, hasLocalData } from "@/features/auth/local-data-summary";
import { measurementRepository } from "@/lib/db/measurement-repository";
import { ocrImageRepository } from "@/lib/db/ocr-image-repository";
import { getDb } from "@/lib/db/schema";

const push = vi.fn();
const refresh = vi.fn();
const signOutMock = vi.fn(async () => ({ error: null }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: signOutMock } }),
}));
vi.mock("@/features/privacy/components/export-all-data-button", () => ({
  ExportAllDataButton: () => <button type="button">Exportar todos os dados</button>,
}));

const input = {
  valueMgDl: 110,
  measuredAt: "2026-08-28T08:30",
  context: "cafe_da_manha" as const,
  mealRelation: "antes" as const,
  source: "manual" as const,
};

beforeEach(async () => {
  vi.clearAllMocks();
  await getDb().measurements.clear();
  await getDb().ocrImages.clear();
});

describe("getLocalDataSummary", () => {
  it("conta só medições ativas e fotos guardadas", async () => {
    const kept = await measurementRepository.create(input);
    const removed = await measurementRepository.create({ ...input, valueMgDl: 120 });
    await ocrImageRepository.save(kept.id, new Blob(["foto"], { type: "image/jpeg" }));
    await measurementRepository.remove(removed.id);

    const summary = await getLocalDataSummary();

    expect(summary).toEqual({ measurements: 1, photos: 1 });
    expect(hasLocalData(summary)).toBe(true);
  });

  it("banco vazio não tem nada a perder", async () => {
    expect(hasLocalData(await getLocalDataSummary())).toBe(false);
  });
});

describe("SignOutButton", () => {
  it("sai direto quando não há dados neste aparelho", async () => {
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole("button", { name: /^sair$/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/entrar"));
    expect(signOutMock).toHaveBeenCalled();
  });

  it("avisa e não sai antes de o usuário confirmar quando há medições e fotos", async () => {
    const measurement = await measurementRepository.create(input);
    await ocrImageRepository.save(measurement.id, new Blob(["foto"], { type: "image/jpeg" }));
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole("button", { name: /^sair$/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(/1 medição/i);
    expect(dialog).toHaveTextContent(/1 foto do visor/i);
    expect(signOutMock).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /exportar todos os dados/i })).toBeInTheDocument();
  });

  it("cancelar mantém a sessão e os dados", async () => {
    await measurementRepository.create(input);
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole("button", { name: /^sair$/i }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(await getDb().measurements.count()).toBe(1);
  });
});
