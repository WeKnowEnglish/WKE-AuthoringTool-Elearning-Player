import { DEFAULT_CHARACTER_CONFIG } from "./character-defaults";
import type { CharacterConfig } from "./character-types";
import {
  WKE_GIRL_HAIR_SWATCHES,
  WKE_GIRL_OUTFIT_SWATCHES,
  WKE_GIRL_SKIN_SWATCHES,
} from "./wke-girl-assets";

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Keeps the sole base/hair/outfit fixed and surprises only the safe colors. */
export function randomCharacterConfig(): CharacterConfig {
  return {
    ...DEFAULT_CHARACTER_CONFIG,
    skinColor: pick(WKE_GIRL_SKIN_SWATCHES).hex,
    hairColor: pick(WKE_GIRL_HAIR_SWATCHES).hex,
    outfitColor: pick(WKE_GIRL_OUTFIT_SWATCHES).hex,
  };
}
