import { SKIN_SWATCHES } from "@/lib/character/character-assets";
import type { CharacterKitDocument, HeadProfileRing, HeadSculptStroke } from "./kit-types";
import {
  CHARACTER_KIT_FORMAT,
  CHARACTER_KIT_VERSION,
  CHIBI_BUST_HERO_ID,
} from "./kit-types";
import { cloneSculptStrokes } from "./sculpt-strokes";

/**
 * Soft egg silhouette for the chibi vinyl reference — gradual cheek fill,
 * round crown, gentle chin into the neck, slight rear width.
 */
export const CHIBI_BUST_PROFILE: HeadProfileRing[] = [
  { y: -0.82, rx: 0.06, rz: 0.06, z: 0.01 },
  { y: -0.74, rx: 0.18, rz: 0.17, z: 0.02 },
  { y: -0.66, rx: 0.32, rz: 0.3, z: 0.03 },
  { y: -0.56, rx: 0.44, rz: 0.4, z: 0.035 },
  { y: -0.44, rx: 0.53, rz: 0.47, z: 0.035 },
  { y: -0.32, rx: 0.58, rz: 0.5, z: 0.03 },
  { y: -0.2, rx: 0.59, rz: 0.52, z: 0.02 },
  { y: -0.08, rx: 0.57, rz: 0.53, z: 0.012 },
  { y: 0.04, rx: 0.55, rz: 0.54, z: 0.005 },
  { y: 0.16, rx: 0.53, rz: 0.55, z: 0 },
  { y: 0.28, rx: 0.51, rz: 0.56, z: -0.008 },
  { y: 0.4, rx: 0.49, rz: 0.55, z: -0.012 },
  { y: 0.52, rx: 0.45, rz: 0.52, z: -0.01 },
  { y: 0.62, rx: 0.38, rz: 0.45, z: -0.006 },
  { y: 0.7, rx: 0.28, rz: 0.34, z: 0 },
  { y: 0.76, rx: 0.16, rz: 0.2, z: 0 },
  { y: 0.8, rx: 0.06, rz: 0.08, z: 0 },
];

/** Wide soft pads only — no hard local bumps. */
export const CHIBI_BUST_SCULPTS: HeadSculptStroke[] = [
  {
    id: "cheek_soft",
    origin: [0.4, -0.24, 0.26],
    radius: 0.34,
    delta: [0, 0, 0],
    mode: "inflate",
    strength: 0.028,
    mirror: true,
  },
  {
    id: "face_soft",
    origin: [0, -0.16, 0.46],
    radius: 0.3,
    delta: [0, 0, 0.012],
    mode: "move",
    strength: 0.02,
    mirror: false,
  },
];

export const CHIBI_BUST_REF_PLATE = "/characters/heroes/chibi_bust_v1_ref.png";

/** Seed kit for the Hero dropdown alternate. Blank face + bust neck. */
export const CHIBI_BUST_KIT: CharacterKitDocument = {
  format: CHARACTER_KIT_FORMAT,
  version: CHARACTER_KIT_VERSION,
  id: "chibi_bust_v1",
  name: "Chibi vinyl bust",
  hero: CHIBI_BUST_HERO_ID,
  skinColor: SKIN_SWATCHES[0].hex,
  hairColor: "#6B3F24",
  regions: { crown: 1.02, cheeks: 1.04, chin: 1 },
  profile: CHIBI_BUST_PROFILE.map((ring) => ({ ...ring })),
  sculpts: cloneSculptStrokes(CHIBI_BUST_SCULPTS),
  plateSrc: CHIBI_BUST_REF_PLATE,
  eyes: { spacing: 0.46, size: 0.9, height: 0.02, forward: 0.48, open: false },
  nose: { size: 0.55, height: -0.12, forward: 0.5 },
  mouth: { width: 1, height: -0.32, forward: 0.48, expression: "smile" },
  ears: { size: 1.05 },
  hair: { hairlineY: 0.2, overshoot: 0.02, backBias: -0.04, tufts: [] },
};

export function isChibiBustHero(heroId: string): boolean {
  return heroId === CHIBI_BUST_HERO_ID;
}
