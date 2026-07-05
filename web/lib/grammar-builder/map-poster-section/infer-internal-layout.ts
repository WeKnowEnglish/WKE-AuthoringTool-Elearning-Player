import { isLabelOnlyText } from "../poster-label";
import type { GrammarCard } from "../schema";

export type PosterInternalLayout =
  | "two_equal"
  | "two_equal_narrow"
  | "banner"
  | "three_column"
  | "full_width_split"
  | "positive_negative"
  | "comparison"
  | "summary_grid"
  | "four_card_grid"
  | "full_width";

export function inferTwoEqualInternalLayout(card: GrammarCard): PosterInternalLayout {
  const first = card.leftColumn?.items[0];
  if (first && isLabelOnlyText(first.text)) {
    return "two_equal_narrow";
  }
  return "two_equal";
}

/** @deprecated Use inferTwoEqualInternalLayout or section.internalLayout. */
export function inferPosterLayout(
  card: GrammarCard,
): "50_50" | "30_70" | "banner" {
  if (card.layoutType === "banner") {
    return "banner";
  }

  if (card.layoutType === "two-equal") {
    return inferTwoEqualInternalLayout(card) === "two_equal_narrow" ? "30_70" : "50_50";
  }

  throw new Error(`inferPosterLayout does not support layoutType: ${card.layoutType}`);
}
