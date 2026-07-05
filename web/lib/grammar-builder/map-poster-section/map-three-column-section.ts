import type { PosterSection, PosterSubHeader } from "@/components/grammar/poster/poster-view-model";
import { GrammarMapError } from "../map-errors";
import { mapPosterItem } from "../map-poster-item";
import type { GrammarCard } from "../schema";
import { buildSectionBase } from "./map-section-base";

function mapSubHeader(card: GrammarCard): PosterSubHeader | undefined {
  if (!card.subHeader) {
    return undefined;
  }

  return {
    label: card.subHeader.label,
    badge: card.subHeader.badge,
    desc: card.subHeader.desc,
    extra: card.subHeader.extra,
  };
}

export function mapThreeColumnSection(
  card: GrammarCard,
  options: { requireKidTitle?: boolean; requireGlanceRule?: boolean } = {},
): PosterSection {
  const base = buildSectionBase(card, "three_column", options);

  if (!card.items?.length) {
    throw new GrammarMapError("three-column layout requires items", card.id);
  }

  return {
    ...base,
    subHeader: mapSubHeader(card),
    columns: card.items.map(mapPosterItem),
  };
}
