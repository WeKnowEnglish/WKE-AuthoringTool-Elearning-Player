import type { PosterSection } from "@/components/grammar/poster/poster-view-model";
import { GrammarMapError } from "../map-errors";
import type { GrammarCard } from "../schema";
import { buildSectionBase } from "./map-section-base";

function bannerHighlightFromText(bannerText: string): string {
  const trimmed = bannerText.trim().replace(/!+$/, "");
  if (/put\s+is\s+or\s+are/i.test(trimmed)) {
    return "Is or Are first";
  }
  if (/there'?s/i.test(trimmed)) {
    return "There's";
  }
  return trimmed;
}

export function mapBannerSection(card: GrammarCard): PosterSection {
  const base = buildSectionBase(card, "banner");
  const panel = card.leftSide;

  if (!panel?.content?.trim()) {
    throw new GrammarMapError("banner layout requires leftSide.content", card.id);
  }

  return {
    ...base,
    rememberBanner: {
      title: panel.title ?? base.kidTitle,
      body: panel.content,
      highlight: bannerHighlightFromText(card.bannerText ?? panel.content),
    },
  };
}
