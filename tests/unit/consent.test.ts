// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordTermsConsent, TERMS_DOCUMENT_VERSION } from "@/lib/supabase/consent";

function fakeClient(user: { id: string } | null, upsertError: { code: string } | null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn(() => ({ upsert })),
  } as unknown as SupabaseClient;
  return { client, upsert };
}

describe("recordTermsConsent", () => {
  afterEach(() => vi.restoreAllMocks());

  it("faz upsert idempotente sem enviar accepted_at", async () => {
    const { client, upsert } = fakeClient({ id: "user-a" }, null);

    await expect(recordTermsConsent(client)).resolves.toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "user-a",
        consent_type: "termos_e_privacidade",
        document_version: TERMS_DOCUMENT_VERSION,
        revoked_at: null,
      },
      { onConflict: "user_id,consent_type,document_version", ignoreDuplicates: true },
    );
  });

  it("retorna false sem lançar quando o banco recusa, logando só o código", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client } = fakeClient({ id: "user-a" }, { code: "42P10" });

    await expect(recordTermsConsent(client)).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith("Falha ao registrar consentimento", "42P10");
  });

  it("não grava nada sem usuário autenticado", async () => {
    const { client, upsert } = fakeClient(null, null);

    await expect(recordTermsConsent(client)).resolves.toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});
