import { describe, expect, it } from "vitest";
import { dailyThemeFromTeacherTheme } from "@/lib/daily/theme-from-teacher";

describe("dailyThemeFromTeacherTheme", () => {
  it("maps teacher light purple into Daily Prebuilt colors", () => {
    const theme = dailyThemeFromTeacherTheme({ mode: "light", tint: "purple" });
    expect("colors" in theme).toBe(true);
    if (!("colors" in theme)) return;
    expect(theme.colors.accent).toMatch(/^#/);
    expect(theme.colors.background).toMatch(/^#/);
    expect(theme.colors.baseText).toMatch(/^#/);
  });

  it("maps dark green differently from light green", () => {
    const light = dailyThemeFromTeacherTheme({ mode: "light", tint: "green" });
    const dark = dailyThemeFromTeacherTheme({ mode: "dark", tint: "green" });
    if (!("colors" in light) || !("colors" in dark)) {
      throw new Error("expected global colors theme");
    }
    expect(light.colors.background).not.toBe(dark.colors.background);
    expect(light.colors.accent).toBeTruthy();
    expect(dark.colors.accent).toBeTruthy();
  });
});
