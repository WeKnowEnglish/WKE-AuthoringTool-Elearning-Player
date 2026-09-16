import { CLOTHING_SWATCHES, HAIR_SWATCHES, SKIN_SWATCHES } from "./character-assets";
import type { CharacterConfig } from "./character-types";

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  body: "body_01",
  skinColor: SKIN_SWATCHES[0].hex,
  hair: "hair_02",
  hairColor: HAIR_SWATCHES[2].hex,
  face: "face_01",
  top: "top_02",
  topColor: CLOTHING_SWATCHES[0].hex,
  bottom: "bottom_01",
  bottomColor: CLOTHING_SWATCHES[4].hex,
  shoes: "shoes_01",
  shoeColor: CLOTHING_SWATCHES[0].hex,
  accessory: null,
};
