"use client";

import type { ReactNode } from "react";
import { setActiveUser } from "@/lib/db/schema";

/**
 * Escopa o Dexie local ao usuário autenticado (id vindo do servidor, via
 * `(protected)/layout.tsx`). Chamado durante o render — e não em
 * `useEffect` — porque efeitos de componentes filhos (ex.: repositórios
 * de medições) podem rodar antes de um efeito equivalente aqui, abrindo o
 * banco local errado.
 */
export function LocalDbUserSync({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  setActiveUser(userId);
  return <>{children}</>;
}
