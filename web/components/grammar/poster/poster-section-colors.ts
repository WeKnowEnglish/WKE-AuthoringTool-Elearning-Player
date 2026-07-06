import type { CardPalette } from "@/lib/grammar-builder/theme-tokens";
import type { PosterSectionColor } from "./poster-view-model";
import { SECTION_COLORS } from "./poster-view-model";

export function getSectionPillColor(color: PosterSectionColor, palette?: CardPalette) {
  return palette?.pill ?? SECTION_COLORS[color].pill;
}
