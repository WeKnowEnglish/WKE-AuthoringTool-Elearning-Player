import type { PosterSection } from "@/components/grammar/poster/poster-view-model";
import { GrammarMapError } from "../map-errors";
import { mapPosterItem } from "../map-poster-item";
import type { GrammarCard } from "../schema";
import { buildSectionBase } from "./map-section-base";

export function mapComparisonSection(
  card: GrammarCard,
  options: { requireKidTitle?: boolean; requireGlanceRule?: boolean } = {},
): PosterSection {
  const base = buildSectionBase(card, "comparison", options);
  const leftColumn = card.leftColumn;
  const rightColumn = card.rightColumn;

  if (!leftColumn) {
    throw new GrammarMapError("comparison layout requires leftColumn", card.id);
  }
  if (!rightColumn) {
    throw new GrammarMapError("comparison layout requires rightColumn", card.id);
  }

  return {
    ...base,
    comparisonLeft: {
      title: leftColumn.title,
      badge: leftColumn.badge,
      items: leftColumn.items.map(mapPosterItem),
    },
    comparisonRight: {
      title: rightColumn.title,
      badge: rightColumn.badge,
      items: rightColumn.items.map(mapPosterItem),
    },
  };
}
