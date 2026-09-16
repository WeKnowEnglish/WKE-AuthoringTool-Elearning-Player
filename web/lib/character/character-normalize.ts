import {
  CLOTHING_SWATCHES,
  HAIR_SWATCHES,
  SKIN_SWATCHES,
  isKnownSwatch,
  isRegisteredPart,
} from "./character-assets";
import { DEFAULT_CHARACTER_CONFIG } from "./character-defaults";
import type { CharacterConfig, CharacterSwatch } from "./character-types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function partId(
  category: "body" | "hair" | "face" | "top" | "bottom" | "shoes",
  value: unknown,
  fallback: string,
): string {
  const id = asString(value);
  if (id && isRegisteredPart(category, id)) return id;
  return fallback;
}

function colorId(value: unknown, swatches: CharacterSwatch[], fallback: string): string {
  const hex = asString(value);
  if (hex && isKnownSwatch(swatches, hex)) {
    return swatches.find((item) => item.hex.toLowerCase() === hex.toLowerCase())?.hex ?? fallback;
  }
  if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  return fallback;
}

function accessoryId(value: unknown): string | null {
  if (value === null || value === "none" || value === "") return null;
  const id = asString(value);
  if (id && isRegisteredPart("accessory", id)) return id;
  return DEFAULT_CHARACTER_CONFIG.accessory;
}

export function normalizeCharacterConfig(raw: unknown): CharacterConfig {
  const source =
    raw && typeof raw === "object" ? (raw as Partial<CharacterConfig>) : DEFAULT_CHARACTER_CONFIG;
  const defaults = DEFAULT_CHARACTER_CONFIG;

  return {
    body: partId("body", source.body, defaults.body),
    skinColor: colorId(source.skinColor, SKIN_SWATCHES, defaults.skinColor),
    hair: partId("hair", source.hair, defaults.hair),
    hairColor: colorId(source.hairColor, HAIR_SWATCHES, defaults.hairColor),
    face: partId("face", source.face, defaults.face),
    top: partId("top", source.top, defaults.top),
    topColor: colorId(source.topColor, CLOTHING_SWATCHES, defaults.topColor),
    bottom: partId("bottom", source.bottom, defaults.bottom),
    bottomColor: colorId(source.bottomColor, CLOTHING_SWATCHES, defaults.bottomColor ?? defaults.topColor),
    shoes: partId("shoes", source.shoes, defaults.shoes),
    shoeColor: colorId(source.shoeColor, CLOTHING_SWATCHES, defaults.shoeColor ?? defaults.topColor),
    accessory: accessoryId(source.accessory),
  };
}
