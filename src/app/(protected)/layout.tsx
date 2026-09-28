import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/server";
import { LocalDbUserSync } from "@/lib/db/local-db-user-sync";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  return (
    <LocalDbUserSync userId={user.id}>
      <div className="flex min-h-full flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:hidden">
            <Logo size="sm" />
            <ConnectionStatus />
          </header>
          <main className="flex flex-1 flex-col pb-[calc(4.5rem+max(0.75rem,env(safe-area-inset-bottom))+1rem)] sm:pb-0">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </LocalDbUserSync>
  );
}
