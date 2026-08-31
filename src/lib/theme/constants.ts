export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "gliconexo-theme";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as string[]).includes(value);
}
