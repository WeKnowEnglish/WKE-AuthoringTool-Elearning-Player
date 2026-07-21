import type { CSSProperties } from "react";

/**
 * Primary Learning chrome tokens (--pl-*).
 * See docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md (products A / B / C).
 */
export const PRIMARY_CHROME_VARS = {
  "--pl-bg": "#f3f0f8",
  "--pl-card": "#ffffff",
  "--pl-ink": "#1e293b",
  "--pl-muted": "#64748b",
  "--pl-border": "#e8e2f0",
  "--pl-purple": "#7c3aed",
  "--pl-purple-soft": "#ede9fe",
  "--pl-teal": "#0d9488",
  "--pl-teal-hover": "#0f766e",
  "--pl-gold": "#f59e0b",
  "--pl-success": "#22c55e",
} as const satisfies Record<`--pl-${string}`, string>;

export const PRIMARY_CHROME_STYLE = PRIMARY_CHROME_VARS as unknown as CSSProperties;

/** Nunito + ink — pair with PRIMARY_CHROME_STYLE on a root element. */
export const PRIMARY_CHROME_CLASS =
  "font-[family-name:var(--font-nunito)] text-[var(--pl-ink)]";
