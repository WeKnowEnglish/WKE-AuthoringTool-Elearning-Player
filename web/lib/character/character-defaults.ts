import type { CharacterConfig } from "./character-types";
import {
  WKE_GIRL_BASE,
  WKE_GIRL_DEFAULT_HAIR,
  WKE_GIRL_DEFAULT_OUTFIT,
  WKE_GIRL_HAIR_SWATCHES,
  WKE_GIRL_OUTFIT_SWATCHES,
  WKE_GIRL_SKIN_SWATCHES,
} from "./wke-girl-assets";

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  version: 2,
  base: WKE_GIRL_BASE.id,
  hair: WKE_GIRL_DEFAULT_HAIR.id,
  outfit: WKE_GIRL_DEFAULT_OUTFIT.id,
  skinColor: WKE_GIRL_SKIN_SWATCHES[0]!.hex,
  hairColor: WKE_GIRL_HAIR_SWATCHES[0]!.hex,
  outfitColor: WKE_GIRL_OUTFIT_SWATCHES[0]!.hex,
};
