import { HAIR_SWATCHES, SKIN_SWATCHES } from "@/lib/character/character-assets";
import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import { referenceKidHair } from "./reference-kid-hair";
import type { CharacterKitDocument, HeadSculptStroke } from "./kit-types";
import { CHARACTER_KIT_FORMAT, CHARACTER_KIT_VERSION, TOY_HEAD_HERO_ID } from "./kit-types";

/** Soft chin + chubby cheek pads. Sockets stay parametric on kit.eyes. */
export const VINYL_SCULPT_RECIPE: HeadSculptStroke[] = [
  {
    id: "chin_pad",
    origin: [0, -0.56, 0.26],
    radius: 0.16,
    delta: [0, -0.01, 0.015],
    mode: "move",
    strength: 0.035,
    mirror: false,
  },
  {
    id: "cheek_pad",
    origin: [0.38, -0.1, 0.28],
    radius: 0.22,
    delta: [0, 0, 0],
    mode: "inflate",
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
  regions: { crown: 1.08, cheeks: 1.06, chin: 1 },
  profile: DEFAULT_HEAD_PROFILE.map((ring) => ({ ...ring })),
  sculpts: VINYL_SCULPT_RECIPE.map((stroke) => ({
    ...stroke,
    origin: [...stroke.origin] as [number, number, number],
    delta: [...stroke.delta] as [number, number, number],
  })),
  eyes: { spacing: 0.46, size: 0.88, height: 0.05, forward: 0.44, open: false },
  nose: { size: 0.58, height: -0.08, forward: 0.48 },
  mouth: { width: 1.02, height: -0.28, forward: 0.46, expression: "smile" },
  ears: { size: 0.6 },
  hair: referenceKidHair(),
};
