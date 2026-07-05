import themeTokensJson from "@/docs/grammar-module/theme-tokens.json";
import type { GrammarThemeId } from "./schema";

type ThemeTokenJson = {
  label: string;
  background: string;
  border: string;
  text: string;
  accentBadge: string;
  tailwind?: {
    background: string;
    border: string;
    text: string;
  };
};

const themeTokens = themeTokensJson as Record<GrammarThemeId, ThemeTokenJson>;

export const GRAMMAR_THEME_IDS = Object.keys(themeTokens) as GrammarThemeId[];

export type ThemeToken = Omit<ThemeTokenJson, "tailwind">;

/** Resolved hex palette for card chrome (header bar, body, pills). */
export type CardPalette = {
  header: string;
  body: string;
  /** Interim: uses theme border; tune in Phase 1b visual QA if pills look too strong. */
  pill: string;
  border: string;
  text: string;
};

export function getThemeToken(themeId: GrammarThemeId): ThemeToken {
  const token = themeTokens[themeId];
  if (!token) {
    throw new Error(`Unknown grammar theme: ${themeId}`);
  }
  const { tailwind: _tailwind, ...rest } = token;
  return rest;
}

const PILOT_PILL_OVERRIDES: Partial<Record<GrammarThemeId, string>> = {
  "sky-blue": "#bfdbfe",
  tangerine: "#fed7aa",
  lavender: "#ddd6fe",
};

export function resolveCardPalette(themeId: GrammarThemeId): CardPalette {
  const token = getThemeToken(themeId);
  return {
    header: token.accentBadge,
    body: token.background,
    pill: PILOT_PILL_OVERRIDES[themeId] ?? token.border,
    border: token.border,
    text: token.text,
  };
}
