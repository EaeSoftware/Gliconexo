import { Home, Plus, ClipboardList, FileText, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/app/registrar", label: "Registrar", icon: Plus },
  { href: "/app/historico", label: "Histórico", icon: ClipboardList },
  { href: "/app/relatorios", label: "Relatórios", icon: FileText },
  { href: "/app/configuracoes", label: "Perfil", icon: Settings },
];
