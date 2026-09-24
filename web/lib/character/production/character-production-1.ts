import { CLOTHING_SWATCHES, HAIR_SWATCHES, SKIN_SWATCHES } from "@/lib/character/character-assets";
import type { CharacterConfig } from "@/lib/character/character-types";
import { cloneHair } from "@/lib/character/kit/hair-shell";
import { DEFAULT_HEAD_PROFILE } from "@/lib/character/kit/head-profile";
import { VINYL_SCULPT_RECIPE } from "@/lib/character/kit/kit-defaults";
import { CHARACTER_KIT_FORMAT, CHARACTER_KIT_VERSION, TOY_HEAD_HERO_ID } from "@/lib/character/kit/kit-types";
import type { CharacterKitDocument, HeadSculptStroke, KitHair } from "@/lib/character/kit/kit-types";
import { cloneSculptStrokes } from "@/lib/character/kit/sculpt-strokes";
import { REFERENCE_KID_HAIR } from "@/lib/character/kit/reference-kid-hair";

export const CHARACTER_PRODUCTION_1_ID = "character_production_1";
export const CHARACTER_PRODUCTION_1_NAME = "Character Production 1";

const PRODUCTION_HAIR: KitHair = {
  hairlineY: 0.08,
  overshoot: 0.04,
  backBias: -0.12,
  shell: REFERENCE_KID_HAIR.shell?.map((ring) => ({ ...ring })),
  tufts: [
    ...REFERENCE_KID_HAIR.tufts.map((tuft) => ({
      ...tuft,
      position: [...tuft.position] as [number, number, number],
      tilt: [...tuft.tilt] as [number, number, number],
    })),
    { id: "tuft_front", position: [0, 0.54, 0.18], radius: 0.06, length: 0.06, tilt: [0.45, 0, 0] },
    { id: "tuft_left", position: [-0.18, 0.6, 0.06], radius: 0.06, length: 0.07, tilt: [0.25, 0, 0.4] },
    { id: "tuft_right", position: [0.18, 0.6, 0.06], radius: 0.06, length: 0.07, tilt: [0.25, 0, -0.4] },
    { id: "tuft_back", position: [0, 0.58, -0.14], radius: 0.07, length: 0.06, tilt: [-0.3, 0, 0] },
  ],
};

const PRODUCTION_SCULPTS: HeadSculptStroke[] = [
  ...cloneSculptStrokes(VINYL_SCULPT_RECIPE),
  {
    id: "jaw_round",
    origin: [0.18, -0.48, 0.26],
    radius: 0.16,
    delta: [0, 0, 0],
    mode: "inflate",
    strength: 0.025,
    mirror: true,
  },
  {
    id: "brow_smooth",
    origin: [0, 0.14, 0.42],
    radius: 0.2,
    delta: [0, 0, 0],
    mode: "flatten",
    strength: 0.07,
    mirror: false,
  },
];

/** Locked vinyl kid head for Character Production 1. */
export const CHARACTER_PRODUCTION_1_KIT: CharacterKitDocument = {
  format: CHARACTER_KIT_FORMAT,
  version: CHARACTER_KIT_VERSION,
  id: CHARACTER_PRODUCTION_1_ID,
  name: CHARACTER_PRODUCTION_1_NAME,
  hero: TOY_HEAD_HERO_ID,
  skinColor: SKIN_SWATCHES[0].hex,
  hairColor: HAIR_SWATCHES[1].hex,
  regions: { crown: 1.08, cheeks: 1.06, chin: 1 },
  profile: DEFAULT_HEAD_PROFILE.map((ring) => ({ ...ring })),
  sculpts: cloneSculptStrokes(PRODUCTION_SCULPTS),
  eyes: { spacing: 0.46, size: 0.88, height: 0.05, forward: 0.44, open: false },
  nose: { size: 0.58, height: -0.08, forward: 0.48 },
  mouth: { width: 1.02, height: -0.28, forward: 0.46, expression: "smile" },
  ears: { size: 0.6 },
  hair: cloneHair(PRODUCTION_HAIR),
};

/** Matching full-body loadout. Clothes are the vinyl figure, not student placeholders. */
export const CHARACTER_PRODUCTION_1_CONFIG: CharacterConfig = {
  body: "body_01",
  skinColor: SKIN_SWATCHES[0].hex,
  hair: "hair_02",
  hairColor: HAIR_SWATCHES[1].hex,
  face: "face_01",
  top: "top_02",
  topColor: CLOTHING_SWATCHES[0].hex,
  bottom: "bottom_01",
  bottomColor: CLOTHING_SWATCHES[4].hex,
  shoes: "shoes_01",
  shoeColor: "#F8FAFC",
  accessory: null,
};
