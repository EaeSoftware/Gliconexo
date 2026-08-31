import { describe, expect, it } from "vitest";
import { isThemePreference } from "@/lib/theme/constants";

describe("isThemePreference", () => {
  it("aceita light, dark e system", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
  });

  it("rejeita valores inválidos ou nulos", () => {
    expect(isThemePreference("blue")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
});
