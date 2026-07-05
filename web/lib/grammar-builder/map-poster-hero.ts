import type { PosterHeroData } from "@/components/grammar/poster/poster-view-model";
import { parseModuleTitleHero } from "./parse-module-title-hero";
import type { GrammarModule } from "./schema";
import { resolveCardPalette } from "./theme-tokens";

export function mapPosterHero(module: GrammarModule): PosterHeroData {
  const sky = resolveCardPalette("sky-blue");
  const tangerine = resolveCardPalette("tangerine");
  const parsed = parseModuleTitleHero(module.moduleTitle);

  if (parsed) {
    return {
      prefix: "GRAMMAR",
      highlightA: { text: parsed.highlightA, color: sky.header },
      middle: "/",
      highlightB: { text: parsed.highlightB, color: tangerine.header },
      suffix: parsed.suffix,
    };
  }

  return {
    prefix: "GRAMMAR",
    highlightA: { text: module.moduleTitle, color: sky.header },
    middle: "",
    highlightB: { text: "", color: tangerine.header },
    suffix: "",
  };
}
