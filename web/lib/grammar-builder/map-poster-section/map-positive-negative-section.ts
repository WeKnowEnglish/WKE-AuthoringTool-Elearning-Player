import type { PosterSection } from "@/components/grammar/poster/poster-view-model";
import { GrammarMapError } from "../map-errors";
import type { GrammarCard } from "../schema";
import { buildSectionBase } from "./map-section-base";
import { mapSidePanel, sideHasDisplayContent } from "./map-side-panel";

export function mapPositiveNegativeSection(
  card: GrammarCard,
  options: { requireKidTitle?: boolean; requireGlanceRule?: boolean } = {},
): PosterSection {
  const base = buildSectionBase(card, "positive_negative", options);
  const positiveSide = card.positiveSide;
  const negativeSide = card.negativeSide;

  if (!positiveSide) {
    throw new GrammarMapError(
      "two-column-positive-negative layout requires positiveSide",
      card.id,
    );
  }
  if (!negativeSide) {
    throw new GrammarMapError(
      "two-column-positive-negative layout requires negativeSide",
      card.id,
    );
  }
  if (!sideHasDisplayContent(positiveSide)) {
    throw new GrammarMapError(
      "positiveSide requires content, example, or formula",
      card.id,
    );
  }
  if (!sideHasDisplayContent(negativeSide)) {
    throw new GrammarMapError(
      "negativeSide requires content, example, or formula",
      card.id,
    );
  }

  return {
    ...base,
    positivePanel: mapSidePanel(positiveSide),
    negativePanel: mapSidePanel(negativeSide),
  };
}
