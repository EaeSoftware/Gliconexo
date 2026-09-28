import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Exclui permanentemente a conta autenticada (CLAUDE.md, seção 15).
 *
 * Não aceita corpo de requisição: o usuário é identificado apenas pela
 * sessão validada no servidor (`supabase.auth.getUser()`), nunca por um
 * `user_id` enviado pelo cliente. Dados vinculados em `consent_records`
 * são removidos automaticamente por `on delete cascade`
 * (`supabase/migrations/20260909000000_consent_records.sql`); não há
 * outras tabelas de usuário no Supabase hoje (medições ficam apenas no
 * IndexedDB local, limpo pelo cliente após a resposta de sucesso). Se
 * `profiles`/`user_preferences`/outras tabelas de usuário forem
 * adicionadas no futuro, confirme que também têm `on delete cascade`
 * em `auth.users(id)` ou adicione a exclusão explícita aqui.
 *
 * Respostas sempre genéricas: nunca repassa mensagens de erro internas
 * do Supabase/Postgres ao cliente.
 */
export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, message: "Não foi possível confirmar sua sessão." },
      { status: 401 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível excluir a conta agora. Tente novamente." },
      { status: 500 },
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json(
      { ok: false, message: "Não foi possível excluir a conta agora. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "Conta excluída." });
}
