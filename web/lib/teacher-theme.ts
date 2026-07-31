/**
 * Teacher app chrome themes (shared with LTC).
 * Modes = surface/contrast; tints = accent family.
 */

export const TEACHER_THEME_MODES = ["light", "medium", "sepia", "dark"] as const;
export type TeacherThemeMode = (typeof TEACHER_THEME_MODES)[number];

export const TEACHER_THEME_TINTS = ["green", "blue", "purple", "orange"] as const;
export type TeacherThemeTint = (typeof TEACHER_THEME_TINTS)[number];

export type TeacherThemeSelection = {
  mode: TeacherThemeMode;
  tint: TeacherThemeTint;
};

export const TEACHER_THEME_DEFAULT: TeacherThemeSelection = {
  mode: "light",
  tint: "purple",
};

export type TeacherThemePreset = TeacherThemeSelection & {
  id: string;
  name: string;
};

const STORAGE_KEY = "wke.teacher.theme.v1";
const LEGACY_LTC_STORAGE_KEY = "wke.ltc.theme.v1";
const PRESETS_STORAGE_KEY = "wke.teacher.theme.presets.v1";
export const TEACHER_THEME_PRESET_MAX = 8;

type SurfaceTokens = {
  bg: string;
  elevated: string;
  panel: string;
  input: string;
  border: string;
  borderStrong: string;
  fg: string;
  muted: string;
  subtle: string;
  warnBg: string;
  warnFg: string;
  warnBorder: string;
  errorBg: string;
  errorFg: string;
  errorBorder: string;
  bridgeBg: string;
  bridgeBorder: string;
  bridgeFg: string;
  bridgeMuted: string;
};

type TintTokens = {
  accent: string;
  accentSoft: string;
  accentFg: string;
  accentBorder: string;
  selectedBg: string;
  selectedBorder: string;
  primaryBtn: string;
  primaryBtnFg: string;
};

const SURFACES: Record<TeacherThemeMode, SurfaceTokens> = {
  light: {
    bg: "#f4f4f5",
    elevated: "#ffffff",
    panel: "#fafafa",
    input: "#ffffff",
    border: "#d4d4d8",
    borderStrong: "#a1a1aa",
    fg: "#18181b",
    muted: "#52525b",
    subtle: "#71717a",
    warnBg: "#fffbeb",
    warnFg: "#78350f",
    warnBorder: "#fde68a",
    errorBg: "#fff1f2",
    errorFg: "#9f1239",
    errorBorder: "#fecdd3",
    bridgeBg: "#fff7ed",
    bridgeBorder: "#fdba74",
    bridgeFg: "#9a3412",
    bridgeMuted: "#c2410c",
  },
  medium: {
    bg: "#3f3f46",
    elevated: "#52525b",
    panel: "#4b4b54",
    input: "#3f3f46",
    border: "#71717a",
    borderStrong: "#a1a1aa",
    fg: "#fafafa",
    muted: "#d4d4d8",
    subtle: "#a1a1aa",
    warnBg: "#713f12",
    warnFg: "#fef3c7",
    warnBorder: "#a16207",
    errorBg: "#881337",
    errorFg: "#ffe4e6",
    errorBorder: "#be123c",
    bridgeBg: "#7c2d12",
    bridgeBorder: "#c2410c",
    bridgeFg: "#ffedd5",
    bridgeMuted: "#fdba74",
  },
  sepia: {
    bg: "#f3e7d3",
    elevated: "#faf3e7",
    panel: "#f7eddc",
    input: "#fffaf2",
    border: "#d6c4a8",
    borderStrong: "#b08968",
    fg: "#3b2f2f",
    muted: "#6b5344",
    subtle: "#8a7060",
    warnBg: "#f5e6c8",
    warnFg: "#6b3e14",
    warnBorder: "#d4a574",
    errorBg: "#f3d6d0",
    errorFg: "#7f1d1d",
    errorBorder: "#d4a5a0",
    bridgeBg: "#efe0c4",
    bridgeBorder: "#c4a574",
    bridgeFg: "#6b3e14",
    bridgeMuted: "#8a5a2b",
  },
  dark: {
    bg: "#020617",
    elevated: "#0f172a",
    panel: "#0b1220",
    input: "#020617",
    border: "#1e293b",
    borderStrong: "#334155",
    fg: "#f1f5f9",
    muted: "#94a3b8",
    subtle: "#64748b",
    warnBg: "#422006",
    warnFg: "#fde68a",
    warnBorder: "#854d0e",
    errorBg: "#4c0519",
    errorFg: "#fecdd3",
    errorBorder: "#9f1239",
    bridgeBg: "#431407",
    bridgeBorder: "#9a3412",
    bridgeFg: "#fdba74",
    bridgeMuted: "#fb923c",
  },
};

const TINTS: Record<TeacherThemeTint, TintTokens> = {
  green: {
    accent: "#34d399",
    accentSoft: "#6ee7b7",
    accentFg: "#022c22",
    accentBorder: "#059669",
    selectedBg: "rgba(6, 78, 59, 0.45)",
    selectedBorder: "rgba(52, 211, 153, 0.75)",
    primaryBtn: "#047857",
    primaryBtnFg: "#ecfdf5",
  },
  blue: {
    accent: "#38bdf8",
    accentSoft: "#7dd3fc",
    accentFg: "#0c4a6e",
    accentBorder: "#0284c7",
    selectedBg: "rgba(12, 74, 110, 0.45)",
    selectedBorder: "rgba(56, 189, 248, 0.75)",
    primaryBtn: "#0369a1",
    primaryBtnFg: "#f0f9ff",
  },
  purple: {
    accent: "#c084fc",
    accentSoft: "#d8b4fe",
    accentFg: "#3b0764",
    accentBorder: "#9333ea",
    selectedBg: "rgba(76, 29, 149, 0.45)",
    selectedBorder: "rgba(192, 132, 252, 0.75)",
    primaryBtn: "#7e22ce",
    primaryBtnFg: "#faf5ff",
  },
  orange: {
    accent: "#fb923c",
    accentSoft: "#fdba74",
    accentFg: "#7c2d12",
    accentBorder: "#ea580c",
    selectedBg: "rgba(124, 45, 18, 0.45)",
    selectedBorder: "rgba(251, 146, 60, 0.75)",
    primaryBtn: "#c2410c",
    primaryBtnFg: "#fff7ed",
  },
};

function modeIsDark(mode: TeacherThemeMode): boolean {
  return mode === "dark" || mode === "medium";
}

function accentLabel(mode: TeacherThemeMode, tint: TeacherThemeTint): string {
  const bright = TINTS[tint].accent;
  if (mode === "light" || mode === "sepia") {
    return (
      {
        green: "#047857",
        blue: "#0369a1",
        purple: "#7e22ce",
        orange: "#c2410c",
      } as const
    )[tint];
  }
  return bright;
}

function selectedTokens(
  mode: TeacherThemeMode,
  tint: TeacherThemeTint,
): Pick<TintTokens, "selectedBg" | "selectedBorder"> {
  if (mode === "light" || mode === "sepia") {
    const soft = {
      green: { selectedBg: "rgba(167, 243, 208, 0.55)", selectedBorder: "#059669" },
      blue: { selectedBg: "rgba(186, 230, 253, 0.65)", selectedBorder: "#0284c7" },
      purple: { selectedBg: "rgba(233, 213, 255, 0.7)", selectedBorder: "#9333ea" },
      orange: { selectedBg: "rgba(254, 215, 170, 0.65)", selectedBorder: "#ea580c" },
    } as const;
    return soft[tint];
  }
  return {
    selectedBg: TINTS[tint].selectedBg,
    selectedBorder: TINTS[tint].selectedBorder,
  };
}

function parseSelection(raw: string | null): TeacherThemeSelection | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TeacherThemeSelection>;
    const mode = TEACHER_THEME_MODES.includes(parsed.mode as TeacherThemeMode)
      ? (parsed.mode as TeacherThemeMode)
      : null;
    const tint = TEACHER_THEME_TINTS.includes(parsed.tint as TeacherThemeTint)
      ? (parsed.tint as TeacherThemeTint)
      : null;
    if (!mode || !tint) return null;
    return { mode, tint };
  } catch {
    return null;
  }
}

export function readTeacherThemeSelection(): TeacherThemeSelection {
  if (typeof window === "undefined") return TEACHER_THEME_DEFAULT;
  try {
    const current = parseSelection(localStorage.getItem(STORAGE_KEY));
    if (current) return current;
    const legacy = parseSelection(localStorage.getItem(LEGACY_LTC_STORAGE_KEY));
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      return legacy;
    }
  } catch {
    /* ignore */
  }
  return TEACHER_THEME_DEFAULT;
}

export function persistTeacherThemeSelection(selection: TeacherThemeSelection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    // Keep LTC key in sync for any leftover local readers.
    localStorage.setItem(LEGACY_LTC_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    /* ignore */
  }
}

function parsePresets(raw: string | null): TeacherThemePreset[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: TeacherThemePreset[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<TeacherThemePreset>;
      const mode = TEACHER_THEME_MODES.includes(row.mode as TeacherThemeMode)
        ? (row.mode as TeacherThemeMode)
        : null;
      const tint = TEACHER_THEME_TINTS.includes(row.tint as TeacherThemeTint)
        ? (row.tint as TeacherThemeTint)
        : null;
      const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : null;
      const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : null;
      if (!mode || !tint || !id || !name) continue;
      out.push({ id, name, mode, tint });
      if (out.length >= TEACHER_THEME_PRESET_MAX) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function readTeacherThemePresets(): TeacherThemePreset[] {
  if (typeof window === "undefined") return [];
  try {
    return parsePresets(localStorage.getItem(PRESETS_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function persistTeacherThemePresets(presets: TeacherThemePreset[]): void {
  try {
    const clipped = presets.slice(0, TEACHER_THEME_PRESET_MAX);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(clipped));
  } catch {
    /* ignore */
  }
}

export const TEACHER_MODE_LABELS: Record<TeacherThemeMode, string> = {
  light: "Light",
  medium: "Medium",
  sepia: "Sepia",
  dark: "Dark",
};

export const TEACHER_TINT_LABELS: Record<TeacherThemeTint, string> = {
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  orange: "Orange",
};

export function defaultTeacherThemePresetName(selection: TeacherThemeSelection): string {
  return `${TEACHER_MODE_LABELS[selection.mode]} · ${TEACHER_TINT_LABELS[selection.tint]}`;
}

export function createTeacherThemePreset(
  name: string,
  selection: TeacherThemeSelection,
  id = `preset-${Date.now().toString(36)}`,
): TeacherThemePreset {
  const trimmed = name.trim() || defaultTeacherThemePresetName(selection);
  return {
    id,
    name: trimmed.slice(0, 40),
    mode: selection.mode,
    tint: selection.tint,
  };
}

/** CSS vars for teacher shell + LTC (aliases). */
export function resolveTeacherThemeCssVars(
  selection: TeacherThemeSelection,
): Record<string, string> {
  const surface = SURFACES[selection.mode];
  const tint = TINTS[selection.tint];
  const selected = selectedTokens(selection.mode, selection.tint);
  const accent = accentLabel(selection.mode, selection.tint);
  const danger = modeIsDark(selection.mode) ? "#fecdd3" : "#be123c";

  const core = {
    bg: surface.bg,
    elevated: surface.elevated,
    panel: surface.panel,
    input: surface.input,
    border: surface.border,
    borderStrong: surface.borderStrong,
    fg: surface.fg,
    muted: surface.muted,
    subtle: surface.subtle,
    accent,
    accentSoft: tint.accentSoft,
    accentFg: tint.accentFg,
    accentBorder: tint.accentBorder,
    selectedBg: selected.selectedBg,
    selectedBorder: selected.selectedBorder,
    primaryBtn: tint.primaryBtn,
    primaryBtnFg: tint.primaryBtnFg,
    warnBg: surface.warnBg,
    warnFg: surface.warnFg,
    warnBorder: surface.warnBorder,
    errorBg: surface.errorBg,
    errorFg: surface.errorFg,
    errorBorder: surface.errorBorder,
    bridgeBg: surface.bridgeBg,
    bridgeBorder: surface.bridgeBorder,
    bridgeFg: surface.bridgeFg,
    bridgeMuted: surface.bridgeMuted,
    danger,
  };

  const teacher: Record<string, string> = {
    "--teacher-bg": core.bg,
    "--teacher-elevated": core.elevated,
    "--teacher-panel": core.panel,
    "--teacher-input": core.input,
    "--teacher-border": core.border,
    "--teacher-border-strong": core.borderStrong,
    "--teacher-fg": core.fg,
    "--teacher-muted": core.muted,
    "--teacher-subtle": core.subtle,
    "--teacher-accent": core.accent,
    "--teacher-accent-soft": core.accentSoft,
    "--teacher-accent-fg": core.accentFg,
    "--teacher-accent-border": core.accentBorder,
    "--teacher-selected-bg": core.selectedBg,
    "--teacher-selected-border": core.selectedBorder,
    "--teacher-primary-btn": core.primaryBtn,
    "--teacher-primary-btn-fg": core.primaryBtnFg,
    "--teacher-warn-bg": core.warnBg,
    "--teacher-warn-fg": core.warnFg,
    "--teacher-warn-border": core.warnBorder,
    "--teacher-error-bg": core.errorBg,
    "--teacher-error-fg": core.errorFg,
    "--teacher-error-border": core.errorBorder,
    "--teacher-danger": core.danger,
    // Back-compat for soft-chrome consumers
    "--teacher-chrome-page": core.bg,
    "--teacher-chrome-header": core.elevated,
    "--teacher-chrome-card": core.panel,
  };

  const ltc: Record<string, string> = {
    "--ltc-bg": core.bg,
    "--ltc-elevated": core.elevated,
    "--ltc-panel": core.panel,
    "--ltc-input": core.input,
    "--ltc-border": core.border,
    "--ltc-border-strong": core.borderStrong,
    "--ltc-fg": core.fg,
    "--ltc-muted": core.muted,
    "--ltc-subtle": core.subtle,
    "--ltc-accent": core.accent,
    "--ltc-accent-soft": core.accentSoft,
    "--ltc-accent-fg": core.accentFg,
    "--ltc-accent-border": core.accentBorder,
    "--ltc-selected-bg": core.selectedBg,
    "--ltc-selected-border": core.selectedBorder,
    "--ltc-primary-btn": core.primaryBtn,
    "--ltc-primary-btn-fg": core.primaryBtnFg,
    "--ltc-warn-bg": core.warnBg,
    "--ltc-warn-fg": core.warnFg,
    "--ltc-warn-border": core.warnBorder,
    "--ltc-error-bg": core.errorBg,
    "--ltc-error-fg": core.errorFg,
    "--ltc-error-border": core.errorBorder,
    "--ltc-bridge-bg": core.bridgeBg,
    "--ltc-bridge-border": core.bridgeBorder,
    "--ltc-bridge-fg": core.bridgeFg,
    "--ltc-bridge-muted": core.bridgeMuted,
    "--ltc-danger": core.danger,
  };

  return { ...teacher, ...ltc };
}

type TeacherThemeStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => TeacherThemeSelection;
  getServerSnapshot: () => TeacherThemeSelection;
  persist: (selection: TeacherThemeSelection) => void;
};

function createTeacherThemeStore(): TeacherThemeStore {
  const listeners = new Set<() => void>();
  let cached: TeacherThemeSelection | null = null;

  function bump() {
    cached = null;
    for (const l of listeners) l();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY ||
        e.key === LEGACY_LTC_STORAGE_KEY ||
        e.key === null
      ) {
        bump();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }
    return () => {
      listeners.delete(listener);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  }

  function getSnapshot(): TeacherThemeSelection {
    if (typeof window === "undefined") return TEACHER_THEME_DEFAULT;
    if (!cached) cached = readTeacherThemeSelection();
    return cached;
  }

  function getServerSnapshot(): TeacherThemeSelection {
    return TEACHER_THEME_DEFAULT;
  }

  function persist(selection: TeacherThemeSelection) {
    persistTeacherThemeSelection(selection);
    bump();
  }

  return { subscribe, getSnapshot, getServerSnapshot, persist };
}

export const teacherThemeStore = createTeacherThemeStore();

type TeacherThemePresetStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => TeacherThemePreset[];
  getServerSnapshot: () => TeacherThemePreset[];
  save: (name: string, selection: TeacherThemeSelection) => TeacherThemePreset | null;
  remove: (id: string) => void;
};

/** Stable empty list for SSR / getServerSnapshot (must be referentially equal). */
const EMPTY_TEACHER_THEME_PRESETS: TeacherThemePreset[] = [];

function createTeacherThemePresetStore(): TeacherThemePresetStore {
  const listeners = new Set<() => void>();
  let cached: TeacherThemePreset[] | null = null;

  function bump() {
    cached = null;
    for (const l of listeners) l();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PRESETS_STORAGE_KEY || e.key === null) bump();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }
    return () => {
      listeners.delete(listener);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  }

  function getSnapshot(): TeacherThemePreset[] {
    if (typeof window === "undefined") return EMPTY_TEACHER_THEME_PRESETS;
    if (!cached) cached = readTeacherThemePresets();
    return cached;
  }

  function getServerSnapshot(): TeacherThemePreset[] {
    return EMPTY_TEACHER_THEME_PRESETS;
  }

  function save(name: string, selection: TeacherThemeSelection): TeacherThemePreset | null {
    const current = getSnapshot();
    if (current.length >= TEACHER_THEME_PRESET_MAX) return null;
    const duplicate = current.find(
      (preset) =>
        preset.mode === selection.mode &&
        preset.tint === selection.tint &&
        preset.name.toLowerCase() ===
          (name.trim() || defaultTeacherThemePresetName(selection)).toLowerCase(),
    );
    if (duplicate) return duplicate;
    const nextPreset = createTeacherThemePreset(name, selection);
    const next = [...current, nextPreset];
    persistTeacherThemePresets(next);
    bump();
    return nextPreset;
  }

  function remove(id: string) {
    const next = getSnapshot().filter((preset) => preset.id !== id);
    persistTeacherThemePresets(next);
    bump();
  }

  return { subscribe, getSnapshot, getServerSnapshot, save, remove };
}

export const teacherThemePresetStore = createTeacherThemePresetStore();
