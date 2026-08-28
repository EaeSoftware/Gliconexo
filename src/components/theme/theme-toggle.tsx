"use client";

import { useThemePreference } from "@/lib/theme/use-theme-preference";
import type { ThemePreference } from "@/lib/theme/constants";

const LABELS: Record<ThemePreference, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
};

const NEXT: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function ThemeToggle() {
  const [preference, setPreference] = useThemePreference();

  return (
    <button
      type="button"
      onClick={() => setPreference(NEXT[preference])}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
      aria-label={`Alternar tema. Tema atual: ${LABELS[preference]}`}
    >
      <span aria-hidden="true">{preference === "dark" ? "🌙" : preference === "light" ? "☀️" : "🖥️"}</span>
      Tema: {LABELS[preference]}
    </button>
  );
}
