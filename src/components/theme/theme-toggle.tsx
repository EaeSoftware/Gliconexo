"use client";

import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { useThemePreference } from "@/lib/theme/use-theme-preference";
import type { ThemePreference } from "@/lib/theme/constants";
import { SettingsButtonRow } from "@/components/ui/settings-row";

const LABELS: Record<ThemePreference, string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
};

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const NEXT: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function ThemeToggle() {
  const [preference, setPreference] = useThemePreference();
  const CurrentIcon = ICONS[preference];

  return (
    <SettingsButtonRow
      icon={Palette}
      label="Aparência"
      description="Toque para alternar entre claro, escuro e sistema"
      onClick={() => setPreference(NEXT[preference])}
      aria-label={`Alternar tema. Tema atual: ${LABELS[preference]}`}
      trailing={
        <span className="inline-flex items-center gap-1.5">
          <CurrentIcon aria-hidden="true" size={16} />
          {LABELS[preference]}
        </span>
      }
    />
  );
}
