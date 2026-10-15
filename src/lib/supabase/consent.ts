import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Versão do texto de termos/privacidade que o usuário está aceitando.
 * Atualizar sempre que o conteúdo de `/termos` ou `/privacidade` mudar
 * de forma relevante, para que o histórico reflita qual versão foi
 * aceita (CLAUDE.md, seção 10.3).
 */
export const TERMS_DOCUMENT_VERSION = "2026-09-09";
const TERMS_CONSENT_TYPE = "termos_e_privacidade";

/**
 * Registra o aceite dos termos/política de privacidade para o usuário
 * autenticado. Idempotente: repetir a chamada (ex.: em cada login) não
 * cria duplicatas nem sobrescreve `accepted_at` de um aceite já
 * existente para a mesma versão do documento.
 *
 * Retorna `false` se o aceite não pôde ser gravado. Não lança: uma falha
 * aqui não deve impedir o login; a próxima chamada tenta de novo.
 */
export async function recordTermsConsent(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("consent_records")
    .upsert(
      {
        user_id: user.id,
        consent_type: TERMS_CONSENT_TYPE,
        document_version: TERMS_DOCUMENT_VERSION,
        revoked_at: null,
      },
      { onConflict: "user_id,consent_type,document_version", ignoreDuplicates: true },
    );

  if (error) {
    // Só o código do erro: nada do usuário vai para o log.
    console.warn("Falha ao registrar consentimento", error.code);
    return false;
  }
  return true;
}

export async function getActiveTermsConsent(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("consent_records")
    .select("accepted_at, revoked_at, document_version")
    .eq("user_id", user.id)
    .eq("consent_type", TERMS_CONSENT_TYPE)
    .eq("document_version", TERMS_DOCUMENT_VERSION)
    .maybeSingle();

  return data ?? null;
}
