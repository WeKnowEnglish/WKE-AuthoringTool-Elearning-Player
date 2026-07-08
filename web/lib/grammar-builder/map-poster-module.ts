import type { PosterHeroData, PosterSection } from "@/components/grammar/poster/poster-view-model";
import { mapPosterHero } from "./map-poster-hero";
import { mapPosterSection } from "./map-poster-section";
import type { GrammarInteraction, GrammarModule, GrammarPageLayout, GrammarPageRow } from "./schema";

export type PosterModuleView = {
  hero: PosterHeroData;
  pageLayout: GrammarPageLayout;
  customRows?: GrammarPageRow[];
  interactions?: GrammarInteraction[];
  sections: PosterSection[];
};

function mapperOptionsForModule(module: GrammarModule) {
  if (module.displayMode === "showcase") {
    return { requireKidTitle: false, requireGlanceRule: false };
  }
  return {};
}

export function mapPosterModule(module: GrammarModule): PosterModuleView {
  const mapperOptions = mapperOptionsForModule(module);

  return {
    hero: mapPosterHero(module),
    pageLayout: module.pageLayout,
    customRows: module.customRows,
    interactions: module.interactions,
    sections: module.cards.map((card) => mapPosterSection(card, mapperOptions)),
  };
}
