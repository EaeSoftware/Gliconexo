import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service role key — só pode ser usado em código
 * server-side (Route Handlers, Server Actions). O pacote `server-only`
 * faz o build falhar caso este módulo seja importado, direta ou
 * indiretamente, por um componente `"use client"` (CLAUDE.md, seção 5:
 * a service role key nunca pode fazer parte do bundle do navegador).
 *
 * Usado apenas para operações administrativas explícitas e auditadas,
 * como a exclusão de conta (CLAUDE.md, seção 15).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Configuração de administração do Supabase ausente.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
