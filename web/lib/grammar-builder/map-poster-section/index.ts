import { GrammarMapError } from "../map-errors";
import type { GrammarCard } from "../schema";
import type { PosterSection } from "@/components/grammar/poster/poster-view-model";
import { mapBannerSection } from "./map-banner-section";
import { mapComparisonSection } from "./map-comparison-section";
import { mapFullWidthSplitSection } from "./map-full-width-split-section";
import { inferPosterLayout } from "./infer-internal-layout";
import { mapFourCardGridSection } from "./map-four-card-grid-section";
import { mapFullWidthSection } from "./map-full-width-section";
import { mapPositiveNegativeSection } from "./map-positive-negative-section";
import { mapSummaryGridSection } from "./map-summary-grid-section";
import { mapThreeColumnSection } from "./map-three-column-section";
import { mapTwoEqualSection } from "./map-two-equal-section";

export { inferPosterLayout, inferTwoEqualInternalLayout } from "./infer-internal-layout";
export type { PosterInternalLayout } from "./infer-internal-layout";

export function mapPosterSection(
  card: GrammarCard,
  options: { requireKidTitle?: boolean; requireGlanceRule?: boolean } = {},
): PosterSection {
  switch (card.layoutType) {
    case "two-equal":
      return mapTwoEqualSection(card);
    case "banner":
      return mapBannerSection(card);
    case "three-column":
      return mapThreeColumnSection(card, options);
    case "full-width-split":
      return mapFullWidthSplitSection(card, options);
    case "two-column-positive-negative":
      return mapPositiveNegativeSection(card, options);
    case "comparison":
      return mapComparisonSection(card, options);
    case "summary-grid":
      return mapSummaryGridSection(card, options);
    case "four-card-grid":
      return mapFourCardGridSection(card, options);
    case "full-width":
      return mapFullWidthSection(card, options);
    default:
      throw new GrammarMapError(
        `Unsupported layoutType for poster mapper: ${card.layoutType}`,
        card.id,
      );
  }
}
