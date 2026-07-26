export const CLASSROOM_THEME_IDS = [
  "sky_day",
  "leaf_garden",
  "coral_studio",
  "ink_slate",
] as const;

export type ClassroomThemeId = (typeof CLASSROOM_THEME_IDS)[number];

export type ClassroomTheme = {
  id: ClassroomThemeId;
  label: string;
  description: string;
  /** Inline CSS custom properties for the public classroom shell. */
  vars: Record<string, string>;
  /** Small swatch colors for the teacher picker. */
  swatches: [string, string, string];
};

export const CLASSROOM_THEMES: Record<ClassroomThemeId, ClassroomTheme> = {
  sky_day: {
    id: "sky_day",
    label: "Sky day",
    description: "Clear blue and sunny accents",
    swatches: ["#152668", "#7dd3fc", "#ffe135"],
    vars: {
      "--classroom-ink": "#152668",
      "--classroom-ink-soft": "#1e3a8a",
      "--classroom-surface": "#e0f2fe",
      "--classroom-surface-2": "#f0f9ff",
      "--classroom-panel": "#ffffff",
      "--classroom-accent": "#0284c7",
      "--classroom-cta": "#ffe135",
      "--classroom-cta-ink": "#152668",
      "--classroom-hero-wash":
        "linear-gradient(160deg, #7dd3fc 0%, #38bdf8 40%, #0ea5e9 100%)",
      "--classroom-hero-overlay":
        "linear-gradient(180deg, rgba(21,38,104,0.15) 0%, rgba(21,38,104,0.72) 100%)",
      "--classroom-tile": "#f0f9ff",
      "--classroom-muted": "#64748b",
    },
  },
  leaf_garden: {
    id: "leaf_garden",
    label: "Leaf garden",
    description: "Fresh greens for outdoor energy",
    swatches: ["#14532d", "#86efac", "#facc15"],
    vars: {
      "--classroom-ink": "#14532d",
      "--classroom-ink-soft": "#166534",
      "--classroom-surface": "#ecfdf5",
      "--classroom-surface-2": "#f0fdf4",
      "--classroom-panel": "#ffffff",
      "--classroom-accent": "#16a34a",
      "--classroom-cta": "#facc15",
      "--classroom-cta-ink": "#14532d",
      "--classroom-hero-wash":
        "linear-gradient(160deg, #86efac 0%, #4ade80 45%, #22c55e 100%)",
      "--classroom-hero-overlay":
        "linear-gradient(180deg, rgba(20,83,45,0.12) 0%, rgba(20,83,45,0.75) 100%)",
      "--classroom-tile": "#f0fdf4",
      "--classroom-muted": "#64748b",
    },
  },
  coral_studio: {
    id: "coral_studio",
    label: "Coral studio",
    description: "Warm coral with bright energy",
    swatches: ["#9a3412", "#fb923c", "#38bdf8"],
    vars: {
      "--classroom-ink": "#7c2d12",
      "--classroom-ink-soft": "#9a3412",
      "--classroom-surface": "#fff7ed",
      "--classroom-surface-2": "#fffbeb",
      "--classroom-panel": "#ffffff",
      "--classroom-accent": "#ea580c",
      "--classroom-cta": "#38bdf8",
      "--classroom-cta-ink": "#0c4a6e",
      "--classroom-hero-wash":
        "linear-gradient(160deg, #fdba74 0%, #fb923c 45%, #f97316 100%)",
      "--classroom-hero-overlay":
        "linear-gradient(180deg, rgba(124,45,18,0.12) 0%, rgba(124,45,18,0.78) 100%)",
      "--classroom-tile": "#fff7ed",
      "--classroom-muted": "#78716c",
    },
  },
  ink_slate: {
    id: "ink_slate",
    label: "Ink slate",
    description: "Calm slate with a clear accent",
    swatches: ["#0f172a", "#94a3b8", "#38bdf8"],
    vars: {
      "--classroom-ink": "#0f172a",
      "--classroom-ink-soft": "#1e293b",
      "--classroom-surface": "#f1f5f9",
      "--classroom-surface-2": "#f8fafc",
      "--classroom-panel": "#ffffff",
      "--classroom-accent": "#0369a1",
      "--classroom-cta": "#38bdf8",
      "--classroom-cta-ink": "#0f172a",
      "--classroom-hero-wash":
        "linear-gradient(160deg, #94a3b8 0%, #64748b 45%, #475569 100%)",
      "--classroom-hero-overlay":
        "linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.8) 100%)",
      "--classroom-tile": "#f8fafc",
      "--classroom-muted": "#64748b",
    },
  },
};

export function isClassroomThemeId(value: unknown): value is ClassroomThemeId {
  return (
    typeof value === "string" &&
    (CLASSROOM_THEME_IDS as readonly string[]).includes(value)
  );
}

export function resolveClassroomTheme(themeId: string | null | undefined): ClassroomTheme {
  if (isClassroomThemeId(themeId)) return CLASSROOM_THEMES[themeId];
  return CLASSROOM_THEMES.sky_day;
}

export function classroomThemeStyle(
  themeId: string | null | undefined,
): Record<string, string> {
  return resolveClassroomTheme(themeId).vars;
}
