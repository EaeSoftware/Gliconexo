import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const getUser = vi.fn();
const signOut = vi.fn().mockResolvedValue({});
const replace = vi.fn();
const deleteLocalDatabase = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getUser, signOut } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/db/schema", () => ({ deleteLocalDatabase }));

const { DeleteAccountSection } = await import(
  "@/features/privacy/components/delete-account-section"
);

describe("DeleteAccountSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("habilita a exclusão para conta com e-mail e senha", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "a", email: "f@exemplo.test", is_anonymous: false } } });
    render(<DeleteAccountSection />);
    expect(await screen.findByRole("button", { name: "Excluir conta" })).toBeEnabled();
  });

  it("explica que visitante não pode excluir conta", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "v", is_anonymous: true } } });
    render(<DeleteAccountSection />);
    expect(await screen.findByText(/modo visitante/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir conta" })).not.toBeInTheDocument();
  });

  it("só confirma com senha e palavra de confirmação, e limpa dados locais após sucesso", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "a", email: "f@exemplo.test", is_anonymous: false } } });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Conta excluída." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DeleteAccountSection />);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir conta" }));

    const submit = screen.getByRole("button", { name: "Excluir definitivamente" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Sua senha"), { target: { value: "senha-ficticia" } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Digite EXCLUIR/), { target: { value: "excluir" } });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/conta/excluir",
      expect.objectContaining({ method: "POST" }),
    );
    expect(deleteLocalDatabase).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  it("mostra erro do servidor e não apaga dados locais", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "a", email: "f@exemplo.test", is_anonymous: false } } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Senha incorreta." }) }),
    );

    render(<DeleteAccountSection />);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir conta" }));
    fireEvent.change(screen.getByLabelText("Sua senha"), { target: { value: "errada" } });
    fireEvent.change(screen.getByLabelText(/Digite EXCLUIR/), { target: { value: "EXCLUIR" } });
    fireEvent.click(screen.getByRole("button", { name: "Excluir definitivamente" }));

    expect(await screen.findByText("Senha incorreta.")).toBeInTheDocument();
    expect(deleteLocalDatabase).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
