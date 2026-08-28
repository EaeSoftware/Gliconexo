import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { ConnectionStatus } from "@/components/layout/connection-status";
import { Logo } from "@/components/ui/logo";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:hidden">
          <Logo size="sm" />
          <ConnectionStatus />
        </header>
        <main className="flex flex-1 flex-col pb-20 sm:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
