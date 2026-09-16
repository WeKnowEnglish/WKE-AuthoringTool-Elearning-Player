import type { Vec3 } from "@/lib/character/character-types";

export const CHARACTER_KIT_FORMAT = "wke-character-kit" as const;
export const CHARACTER_KIT_VERSION = 1;
export const TOY_HEAD_HERO_ID = "toy_head_v1";

export type HeadHeroId = string;
export type KitMouthExpression = "smile" | "cheer" | "wow";

export type HeadRegions = {
  crown: number;
  cheeks: number;
  chin: number;
};

export const HEAD_PLATE_VIEWS = ["front", "threeQuarter", "side"] as const;
export type HeadPlateView = (typeof HEAD_PLATE_VIEWS)[number];

/**
 * Local vertex push on the dense skull. Cursor writes these instead of
 * inflate sliders so cheeks, chin, and sockets can be shaped independently.
 */
export type HeadSculptStroke = {
  id: string;
  origin: Vec3;
  radius: number;
  delta: Vec3;
  /** Mirror across X when origin is off-center. Default true. */
  mirror?: boolean;
};

export type KitEyes = {
  spacing: number;
  size: number;
  height: number;
  forward: number;
  open: boolean;
};

export type KitNose = {
  size: number;
  height: number;
  forward: number;
};

export type KitMouth = {
  width: number;
  height: number;
  forward: number;
  expression: KitMouthExpression;
};

export type KitEars = {
  size: number;
};

/**
 * One latitude of a profile mesh. Cursor authors these from a reference
 * photo. `rx` is left/right, `rz` is front/back, `z` shifts the ring
 * (hair shells sit back so the forehead stays skin).
 */
export type HeadProfileRing = {
  y: number;
  rx: number;
  rz: number;
  z?: number;
};

export type KitHairTuft = {
  id: string;
  position: Vec3;
  radius: number;
  length: number;
  tilt: Vec3;
};

export type KitHair = {
  /** Y where the shell starts. Skin above the eyes stays visible. */
  hairlineY: number;
  /** How much larger the shell is than the skull. */
  overshoot: number;
  /** Negative pulls the hairline back (forehead). */
  backBias: number;
  /** Optional explicit shell. Omit to derive from the skull above hairlineY. */
  shell?: HeadProfileRing[];
  tufts: KitHairTuft[];
};

/**
 * Cursor-writable head kit. The local mesh builder turns this into a GLB.
 * Do not store raw triangles here.
 */
export type CharacterKitDocument = {
  format: typeof CHARACTER_KIT_FORMAT;
  version: typeof CHARACTER_KIT_VERSION;
  id: string;
  name: string;
  hero: HeadHeroId;
  skinColor: string;
  hairColor: string;
  regions: HeadRegions;
  /** Optional skull silhouette. Omit to use the default kid profile. */
  profile?: HeadProfileRing[];
  /** Dense-mesh sculpt strokes. Applied after the lathe and sockets. */
  sculpts?: HeadSculptStroke[];
  /** Optional reference photo for the current plate view. */
  plateSrc?: string;
  eyes: KitEyes;
  nose: KitNose;
  mouth: KitMouth;
  ears: KitEars;
  hair: KitHair;
};
