import type { CSSProperties } from "react";

/**
 * Secondary study-desk chrome tokens (--sec-*).
 * Calm, cool paper — distinct from Primary --pl-* and Play --kid-*.
 * @see docs/student-ecosystem-upgrade.md (F8)
 */
export const SECONDARY_CHROME_VARS = {
  "--sec-bg": "#f3f6fa",
  "--sec-card": "#ffffff",
  "--sec-ink": "#1e293b",
  "--sec-muted": "#64748b",
  "--sec-border": "#cbd5e1",
  "--sec-accent": "#0f766e",
  "--sec-accent-hover": "#0d9488",
  "--sec-accent-soft": "#ccfbf1",
  "--sec-panel": "#ffffff",
  "--sec-panel-muted": "#eef2f7",
  "--sec-success": "#059669",
} as const satisfies Record<`--sec-${string}`, string>;

export const SECONDARY_CHROME_STYLE = SECONDARY_CHROME_VARS as unknown as CSSProperties;

/** Nunito + desk ink — pair with SECONDARY_CHROME_STYLE on a portal root. */
export const SECONDARY_CHROME_CLASS =
  "font-[family-name:var(--font-nunito)] text-[var(--sec-ink)]";
