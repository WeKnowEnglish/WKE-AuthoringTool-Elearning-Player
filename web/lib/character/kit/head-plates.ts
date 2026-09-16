import type { HeadPlateView } from "./kit-types";

export const HEAD_PLATE_YAW: Record<HeadPlateView, number> = {
  front: 0,
  threeQuarter: 0.7,
  side: Math.PI / 2,
};

export const HEAD_PLATE_LABEL: Record<HeadPlateView, string> = {
  front: "Front",
  threeQuarter: "3/4",
  side: "Side",
};

export const SEED_HEAD_GHOST_SRC = "/characters/heroes/seed_boy_head.glb?v=16";
/** GLB-space chin-to-crown of the hair-dropped reconstruction (character:fit-skull). */
export const SEED_HEAD_SKULL_SPAN = 1.347;
/** Toy cage height the fitted rings are normalized to. */
export const SEED_HEAD_CAGE_HEIGHT = 1.46;
/**
 * Uniform scale for the fused seed GLB so its inner skull matches the cage.
 * Do not fit the hair-inclusive bbox to cage height — that shrinks the face.
 */
export const SEED_HEAD_GHOST_SCALE = SEED_HEAD_CAGE_HEIGHT / SEED_HEAD_SKULL_SPAN;
/** Fused seed (hair included) height in GLB space. */
export const SEED_HEAD_FUSED_HEIGHT = 1.785;
/**
 * AABB of the fused mesh is hair-high. Lift so the reconstructed skull, not
 * the hair halo, sits on the cage origin.
 */
export const SEED_HEAD_GHOST_LIFT_Y =
  ((SEED_HEAD_FUSED_HEIGHT - SEED_HEAD_SKULL_SPAN) / 2) * SEED_HEAD_GHOST_SCALE;

export const HEAD_PLATE_SIZE = 2.35;
export const HEAD_PLATE_DEPTH = -1.2;
