import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Exclusão de conta (CLAUDE.md, seção 15): o usuário é identificado
// sempre pela sessão (cookies), nunca por um `user_id` vindo do
// navegador. A service role só existe aqui, no servidor. As tabelas de
// dados do usuário referenciam `auth.users` com `on delete cascade`,
// então apagar o usuário de autenticação apaga os dados vinculados.

const GENERIC_ERROR = "Não foi possível excluir a conta. Tente novamente em instantes.";

function json(status: number, message: string) {
  return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return json(403, GENERIC_ERROR);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return json(503, "A exclusão de conta está temporariamente indisponível.");
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return json(400, "Informe sua senha para confirmar.");
  }
  if (typeof password !== "string" || password.length === 0 || password.length > 200) {
    return json(400, "Informe sua senha para confirmar.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json(401, "Sua sessão expirou. Entre novamente para excluir a conta.");
  }
  if (user.is_anonymous || !user.email) {
    return json(403, "A exclusão de conta está disponível para contas com e-mail e senha.");
  }

  // Reconfirma a senha num cliente isolado (sem persistir sessão), para
  // que um aparelho desbloqueado não baste para apagar a conta.
  const verifier = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: verified, error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (verifyError || verified.user?.id !== user.id) {
    return json(401, "Senha incorreta.");
  }
  await verifier.auth.signOut().catch(() => undefined);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return json(503, "A exclusão de conta está temporariamente indisponível.");
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return json(500, GENERIC_ERROR);
  }

  // Remove os cookies de sessão; o usuário já não existe no servidor.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

  return json(200, "Conta excluída.");
}
