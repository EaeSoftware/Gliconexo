"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/features/navigation/nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(0,0,0,0.06)] sm:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
          const isPrimary = item.href === "/app/registrar";
          const Icon = item.icon;

          if (isPrimary) {
            return (
              <li key={item.href} className="flex min-h-[4.5rem] items-stretch justify-center">
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="flex w-full flex-col items-center justify-center gap-1.5 text-xs font-semibold text-brand-blue"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-teal text-white shadow-md transition-transform active:scale-95">
                    <Icon aria-hidden="true" size={24} strokeWidth={2.25} />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href} className="flex min-h-[4.5rem] items-stretch justify-center">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full flex-col items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
                  isActive ? "text-brand-blue" : "text-foreground/60"
                }`}
              >
                <Icon aria-hidden="true" size={24} strokeWidth={isActive ? 2.25 : 2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
