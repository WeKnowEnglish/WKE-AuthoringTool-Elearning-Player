import type {
  PosterSection,
  PosterSectionColor,
} from "@/components/grammar/poster/poster-view-model";
import { GrammarMapError } from "../map-errors";
import type { GrammarCard, GrammarThemeId } from "../schema";
import { resolveCardPalette } from "../theme-tokens";
import type { PosterInternalLayout } from "./infer-internal-layout";

const THEME_TO_LEGACY_COLOR: Record<GrammarThemeId, PosterSectionColor> = {
  "sky-blue": "blue",
  tangerine: "orange",
  lavender: "purple",
  "mint-green": "green",
  "sun-gold": "yellow",
  bubblegum: "pink",
};

type SectionBase = Omit<
  PosterSection,
  | "leftLabel"
  | "leftEmoji"
  | "leftExamples"
  | "rightLabel"
  | "rightEmoji"
  | "rightExamples"
  | "rememberBanner"
  | "subHeader"
  | "columns"
  | "leftPanel"
  | "rightPanel"
  | "leftPatterns"
  | "rightNote"
  | "positivePanel"
  | "negativePanel"
  | "comparisonLeft"
  | "comparisonRight"
  | "summaryGrid"
  | "miniCards"
  | "stackedExamples"
  | "goodBadPair"
>;

export function themeToSectionColor(theme: GrammarThemeId): PosterSectionColor {
  return THEME_TO_LEGACY_COLOR[theme];
}

export function buildSectionBase(
  card: GrammarCard,
  internalLayout: PosterInternalLayout,
  options: { requireKidTitle?: boolean; requireGlanceRule?: boolean } = {},
): SectionBase {
  const requireKidTitle = options.requireKidTitle ?? true;
  const requireGlanceRule = options.requireGlanceRule ?? true;
  const glanceRule = card.glanceRule;

  if (requireGlanceRule && !glanceRule?.text?.trim()) {
    throw new GrammarMapError("Poster card requires glanceRule", card.id);
  }

  const kidTitle = card.kidTitle?.trim() || card.title;
  if (requireKidTitle && !card.kidTitle?.trim()) {
    throw new GrammarMapError("Poster card requires kidTitle", card.id);
  }

  return {
    number: card.id,
    title: card.title,
    kidTitle,
    kidSubtitle: card.kidSubtitle,
    chromeAlign: card.chromeAlign ?? "center",
    glanceRule: {
      text: glanceRule?.text ?? "",
      highlight: glanceRule?.highlight,
      align: glanceRule?.align ?? "center",
    },
    color: THEME_TO_LEGACY_COLOR[card.theme],
    theme: card.theme,
    palette: resolveCardPalette(card.theme),
    layoutType: card.layoutType,
    internalLayout,
  };
}
