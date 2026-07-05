import type { PosterSection } from "@/components/grammar/poster/poster-view-model";
import { GrammarMapError } from "../map-errors";
import type { GrammarCard } from "../schema";
import { resolveCardPalette } from "../theme-tokens";
import { buildSectionBase, themeToSectionColor } from "./map-section-base";

export function mapFourCardGridSection(
  card: GrammarCard,
  options: { requireKidTitle?: boolean; requireGlanceRule?: boolean } = {},
): PosterSection {
  const base = buildSectionBase(card, "four_card_grid", options);

  if (!card.miniCards || card.miniCards.length !== 4) {
    throw new GrammarMapError("four-card-grid layout requires exactly 4 miniCards", card.id);
  }

  return {
    ...base,
    miniCards: card.miniCards.map((mini) => {
      const theme = mini.theme ?? card.theme;
      return {
        title: mini.title,
        rule: mini.rule,
        formula: mini.formula,
        badge: mini.badge,
        color: themeToSectionColor(theme),
        palette: resolveCardPalette(theme),
      };
    }),
  };
}
