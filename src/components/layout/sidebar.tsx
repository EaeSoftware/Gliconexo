"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/features/navigation/nav-items";
import { Logo } from "@/components/ui/logo";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface p-4 sm:flex">
      <Link href="/app" className="mb-6 px-2">
        <Logo size="sm" />
      </Link>
      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                isActive
                  ? "bg-brand-blue/10 text-brand-blue"
                  : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
