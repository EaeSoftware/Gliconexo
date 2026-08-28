import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Página inicial do GlicoNexo">
            <Logo size="sm" />
          </Link>
          <nav aria-label="Autenticação" className="flex items-center gap-2">
            <ButtonLink href="/entrar" variant="ghost" className="hidden sm:inline-flex">
              Entrar
            </ButtonLink>
            <ButtonLink href="/cadastro" variant="primary">
              Criar conta
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-foreground/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>&copy; {new Date().getFullYear()} GlicoNexo. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:text-foreground hover:underline">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-foreground hover:underline">
              Termos de uso
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
