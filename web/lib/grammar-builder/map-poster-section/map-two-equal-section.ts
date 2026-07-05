import type { PosterSection } from "@/components/grammar/poster/poster-view-model";
import { GrammarMapError } from "../map-errors";
import { mapPosterItem } from "../map-poster-item";
import type { GrammarCard } from "../schema";
import { inferTwoEqualInternalLayout } from "./infer-internal-layout";
import { buildSectionBase } from "./map-section-base";

const RIGHT_COLUMN_META_LABELS = new Set(["EXAMPLES", "EXAMPLE", "SAMPLE", "SAMPLES"]);

function mapGoodBadPair(card: GrammarCard) {
  if (!card.goodBadPair) {
    return undefined;
  }

  return {
    good: {
      sentence: card.goodBadPair.good.text,
      emoji: card.goodBadPair.good.graphic ?? "✓",
      highlight: card.goodBadPair.good.highlight,
    },
    bad: {
      sentence: card.goodBadPair.bad.text,
      emoji: card.goodBadPair.bad.graphic ?? "✗",
      highlight: card.goodBadPair.bad.highlight,
    },
  };
}

export function mapTwoEqualSection(card: GrammarCard): PosterSection {
  const internalLayout = inferTwoEqualInternalLayout(card);
  const base = buildSectionBase(card, internalLayout);

  const leftColumn = card.leftColumn;
  const rightColumn = card.rightColumn;

  if (!leftColumn || !rightColumn) {
    throw new GrammarMapError("two-equal layout requires leftColumn and rightColumn", card.id);
  }

  const section: PosterSection = {
    ...base,
    leftLabel: leftColumn.title,
    leftEmoji: leftColumn.badge,
    leftExamples: leftColumn.items.map(mapPosterItem),
    goodBadPair: mapGoodBadPair(card),
  };

  const showRightPill = !RIGHT_COLUMN_META_LABELS.has(rightColumn.title.toUpperCase());

  if (showRightPill) {
    section.rightLabel = rightColumn.title;
    section.rightEmoji = rightColumn.badge;
  }

  section.rightExamples = rightColumn.items.map(mapPosterItem);

  return section;
}
