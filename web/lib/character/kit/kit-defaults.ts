import { HAIR_SWATCHES, SKIN_SWATCHES } from "@/lib/character/character-assets";
import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import { referenceKidHair } from "./reference-kid-hair";
import type { CharacterKitDocument, HeadSculptStroke } from "./kit-types";
import { CHARACTER_KIT_FORMAT, CHARACTER_KIT_VERSION, TOY_HEAD_HERO_ID } from "./kit-types";

/** Authorable vinyl chin pad + cheek tuck. Sockets stay parametric on kit.eyes. */
export const VINYL_SCULPT_RECIPE: HeadSculptStroke[] = [
  {
    id: "chin_pad",
    origin: [0, -0.74, 0.32],
    radius: 0.22,
    delta: [0, -0.025, 0.055],
    mode: "move",
    strength: 0.06,
    mirror: false,
  },
  {
    id: "cheek_tuck",
    origin: [0.48, -0.1, 0.28],
    radius: 0.28,
    delta: [0, 0, 0],
    mode: "pinch",
    strength: 0.04,
    mirror: true,
  },
];

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
  sculpts: VINYL_SCULPT_RECIPE.map((stroke) => ({
    ...stroke,
    origin: [...stroke.origin] as [number, number, number],
    delta: [...stroke.delta] as [number, number, number],
  })),
  eyes: { spacing: 0.54, size: 1.3, height: 0.04, forward: 0.56, open: false },
  nose: { size: 0.78, height: -0.14, forward: 0.62 },
  mouth: { width: 1.32, height: -0.38, forward: 0.58, expression: "smile" },
  ears: { size: 0.72 },
  hair: referenceKidHair(),
};
