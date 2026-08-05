import type { DailyThemeConfig } from "@daily-co/daily-js";
import {
  resolveTeacherThemeCssVars,
  type TeacherThemeSelection,
} from "@/lib/teacher-theme";

/** Map the teacher's selected chrome theme onto Daily Prebuilt colors. */
export function dailyThemeFromTeacherTheme(
  selection: TeacherThemeSelection,
): DailyThemeConfig {
  const vars = resolveTeacherThemeCssVars(selection);
  return {
    colors: {
      accent: vars["--teacher-primary-btn"],
      accentText: vars["--teacher-primary-btn-fg"],
      background: vars["--teacher-elevated"],
      backgroundAccent: vars["--teacher-panel"],
      baseText: vars["--teacher-fg"],
      border: vars["--teacher-border"],
      mainAreaBg: vars["--teacher-bg"],
      mainAreaBgAccent: vars["--teacher-elevated"],
      mainAreaText: vars["--teacher-fg"],
      supportiveText: vars["--teacher-muted"],
    },
  };
}

export function dailyThemeColorsKey(theme: DailyThemeConfig): string {
  const colors =
    "colors" in theme && theme.colors
      ? theme.colors
      : "light" in theme
        ? theme.light.colors
        : {};
  return JSON.stringify(colors ?? {});
}
