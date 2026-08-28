export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "Início", icon: "🏠" },
  { href: "/app/registrar", label: "Registrar", icon: "➕" },
  { href: "/app/historico", label: "Histórico", icon: "📋" },
  { href: "/app/relatorios", label: "Relatórios", icon: "📄" },
  { href: "/app/configuracoes", label: "Perfil", icon: "⚙️" },
];
