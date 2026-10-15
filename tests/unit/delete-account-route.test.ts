// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUser = vi.fn();
const serverSignOut = vi.fn().mockResolvedValue({});
const signInWithPassword = vi.fn();
const deleteUser = vi.fn();

// `admin.ts` importa `server-only`, que lança fora de um Server Component; no teste basta neutralizá-lo.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser, signOut: serverSignOut } }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword,
      signOut: vi.fn().mockResolvedValue({}),
      admin: { deleteUser },
    },
  }),
}));

const { POST } = await import("@/app/api/conta/excluir/route");

const ORIGIN = "https://app.exemplo.test";

function request(body: unknown, origin: string | null = ORIGIN) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin) headers.origin = origin;
  return new NextRequest(`${ORIGIN}/api/conta/excluir`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const emailUser = { id: "user-a", email: "ficticio@exemplo.test", is_anonymous: false };

describe("POST /api/conta/excluir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.exemplo.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    getUser.mockResolvedValue({ data: { user: emailUser } });
    signInWithPassword.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
    deleteUser.mockResolvedValue({ error: null });
  });

  it("rejeita requisição de outra origem", async () => {
    const res = await POST(request({ password: "x" }, "https://malicioso.test"));
    expect(res.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("responde 503 sem a service role configurada", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await POST(request({ password: "x" }));
    expect(res.status).toBe(503);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("exige sessão", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(request({ password: "x" }));
    expect(res.status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("não permite exclusão para visitante anônimo", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "anon", is_anonymous: true } } });
    const res = await POST(request({ password: "x" }));
    expect(res.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("recusa senha incorreta", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    const res = await POST(request({ password: "errada" }));
    expect(res.status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("exige senha no corpo", async () => {
    const res = await POST(request({}));
    expect(res.status).toBe(400);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("exclui o usuário da sessão, ignorando qualquer id enviado pelo cliente", async () => {
    const res = await POST(request({ password: "certa", userId: "user-b" }));
    expect(res.status).toBe(200);
    expect(signInWithPassword).toHaveBeenCalledWith({ email: emailUser.email, password: "certa" });
    expect(deleteUser).toHaveBeenCalledWith("user-a");
    expect(serverSignOut).toHaveBeenCalled();
  });

  it("devolve erro genérico se a exclusão falhar", async () => {
    deleteUser.mockResolvedValue({ error: new Error("db detail") });
    const res = await POST(request({ password: "certa" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).not.toContain("db detail");
  });
});
