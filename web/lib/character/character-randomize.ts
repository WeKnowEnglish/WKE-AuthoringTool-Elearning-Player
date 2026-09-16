import {
  CHARACTER_ASSETS,
  CLOTHING_SWATCHES,
  HAIR_SWATCHES,
  SKIN_SWATCHES,
} from "./character-assets";
import type { CharacterConfig } from "./character-types";

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function randomCharacterConfig(): CharacterConfig {
  const accessory = Math.random() < 0.45 ? pick(CHARACTER_ASSETS.accessory).id : null;
  return {
    body: pick(CHARACTER_ASSETS.body).id,
    skinColor: pick(SKIN_SWATCHES).hex,
    hair: pick(CHARACTER_ASSETS.hair).id,
    hairColor: pick(HAIR_SWATCHES).hex,
    face: pick(CHARACTER_ASSETS.face).id,
    top: pick(CHARACTER_ASSETS.top).id,
    topColor: pick(CLOTHING_SWATCHES).hex,
    bottom: pick(CHARACTER_ASSETS.bottom).id,
    bottomColor: pick(CLOTHING_SWATCHES).hex,
    shoes: pick(CHARACTER_ASSETS.shoes).id,
    shoeColor: pick(CLOTHING_SWATCHES).hex,
    accessory,
  };
}
