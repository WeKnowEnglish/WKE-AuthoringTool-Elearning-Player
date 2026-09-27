import { DEFAULT_CHARACTER_CONFIG } from "./character-defaults";
import type { CharacterConfig, CharacterSwatch } from "./character-types";
import {
  WKE_GIRL_DEFAULT_HAIR,
  WKE_GIRL_DEFAULT_OUTFIT,
  WKE_GIRL_HAIR_SWATCHES,
  WKE_GIRL_OUTFIT_SWATCHES,
  WKE_GIRL_SKIN_SWATCHES,
  isKnownWkeGirlSwatch,
  isWkeGirlBase,
  isWkeGirlHair,
  isWkeGirlOutfit,
} from "./wke-girl-assets";

function color(
  value: unknown,
  swatches: CharacterSwatch[],
  fallback: string,
): string {
  if (!isKnownWkeGirlSwatch(swatches, value)) return fallback;
  return (
    swatches.find((item) => item.hex.toLowerCase() === value.toLowerCase())?.hex ??
    value
  );
}

/**
 * Normalizes both the v2 single-girl document and the former procedural
 * loadout. Legacy top/bottom colors are deliberately migrated so existing
 * students keep a recognizable palette after the base-avatar switch.
 */
export function normalizeCharacterConfig(raw: unknown): CharacterConfig {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const defaults = DEFAULT_CHARACTER_CONFIG;

  return {
    version: 2,
    base: isWkeGirlBase(source.base) ? source.base : defaults.base,
    hair: isWkeGirlHair(source.hair)
      ? source.hair
      : WKE_GIRL_DEFAULT_HAIR.id,
    outfit: isWkeGirlOutfit(source.outfit)
      ? source.outfit
      : WKE_GIRL_DEFAULT_OUTFIT.id,
    skinColor: color(
      source.skinColor,
      WKE_GIRL_SKIN_SWATCHES,
      defaults.skinColor,
    ),
    hairColor: color(
      source.hairColor,
      WKE_GIRL_HAIR_SWATCHES,
      defaults.hairColor,
    ),
    outfitColor: color(
      source.outfitColor ?? source.topColor,
      WKE_GIRL_OUTFIT_SWATCHES,
      defaults.outfitColor,
    ),
  };
}
