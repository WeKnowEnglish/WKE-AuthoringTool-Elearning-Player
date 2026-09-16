import { HAIR_SWATCHES, SKIN_SWATCHES } from "@/lib/character/character-assets";
import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import { referenceKidHair } from "./reference-kid-hair";
import type { CharacterKitDocument } from "./kit-types";
import { CHARACTER_KIT_FORMAT, CHARACTER_KIT_VERSION, TOY_HEAD_HERO_ID } from "./kit-types";

export const DEFAULT_CHARACTER_KIT: CharacterKitDocument = {
  format: CHARACTER_KIT_FORMAT,
  version: CHARACTER_KIT_VERSION,
  id: "wke_simple_kid",
  name: "Simple kid",
  hero: TOY_HEAD_HERO_ID,
  skinColor: SKIN_SWATCHES[0].hex,
  hairColor: HAIR_SWATCHES[2].hex,
  regions: { crown: 1, cheeks: 1, chin: 1 },
  profile: DEFAULT_HEAD_PROFILE.map((ring) => ({ ...ring })),
  sculpts: [],
  eyes: { spacing: 0.54, size: 1.3, height: 0.04, forward: 0.56, open: false },
  nose: { size: 0.78, height: -0.14, forward: 0.62 },
  mouth: { width: 1.32, height: -0.38, forward: 0.58, expression: "smile" },
  ears: { size: 0.72 },
  hair: referenceKidHair(),
};
