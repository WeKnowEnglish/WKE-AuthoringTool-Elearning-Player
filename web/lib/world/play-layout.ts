import { aabbFromCenter, type Aabb } from "./play-move";
import type { PlaySpotId } from "./play-spots";

export const PLAYER_RADIUS = 0.28;
export const PLAYER_SPEED = 4.2;
export const YARD_RADIUS = 14;

export const PLAY_SCALE: Record<PlaySpotId, number> = {
  cottage: 4,
  school: 5,
};

function scaledAabb(spot: PlaySpotId, x: number, z: number, width: number, depth: number): Aabb {
  const scale = PLAY_SCALE[spot];
  return aabbFromCenter(x * scale, z * scale, width * scale, depth * scale);
}

export function yardSpawn(spot: PlaySpotId): { x: number; z: number } {
  return spot === "cottage" ? { x: 0, z: 6.2 } : { x: 0, z: 9.4 };
}

export function yardDoor(spot: PlaySpotId): { x: number; z: number } {
  const scale = PLAY_SCALE[spot];
  return spot === "cottage" ? { x: 0, z: 0.55 * scale } : { x: 0, z: 0.52 * scale };
}

/** Solid bits in the walkable yard: building, fence (with a gate gap), bus. */
export function yardWalls(spot: PlaySpotId): Aabb[] {
  if (spot === "cottage") {
    return [
      scaledAabb(spot, 0, -0.04, 1.22, 1.0),
      scaledAabb(spot, -0.6, 0.92, 0.52, 0.1),
      scaledAabb(spot, 0.6, 0.92, 0.52, 0.1),
    ];
  }
  return [
    scaledAabb(spot, 0, 0, 2.42, 0.72),
    scaledAabb(spot, -0.96, 1.48, 1.18, 0.1),
    scaledAabb(spot, 1.08, 1.48, 1.4, 0.1),
    scaledAabb(spot, -1.55, 0.45, 0.1, 2.06),
    scaledAabb(spot, 1.78, 0.45, 0.1, 2.06),
    scaledAabb(spot, 0.115, -0.58, 3.33, 0.1),
    scaledAabb(spot, -1.12, 1.94, 1.22, 0.5),
  ];
}

export function houseInsideWalls(): Aabb[] {
  const pad = 0.08;
  return [
    aabbFromCenter(0, -5.15, 10.6, 0.4, pad),
    aabbFromCenter(-5.15, 0, 0.4, 10.6, pad),
    aabbFromCenter(5.15, 0, 0.4, 10.6, pad),
    aabbFromCenter(-3.2, 5.15, 4.2, 0.4, pad),
    aabbFromCenter(3.2, 5.15, 4.2, 0.4, pad),
    aabbFromCenter(3.35, -3.85, 1.3, 2.2, pad),
  ];
}

export function houseInsideDoor(): { x: number; z: number } {
  return { x: 0, z: 4.6 };
}

export function houseInsideSpawn(): { x: number; z: number } {
  return { x: 0, z: 2.4 };
}

export function houseInsideBounds(): Aabb {
  return { minX: -5.05, maxX: 5.05, minZ: -5.05, maxZ: 5.35 };
}

export function schoolInsideWalls(): Aabb[] {
  const pad = 0.08;
  return [
    aabbFromCenter(0, -6.15, 16.6, 0.4, pad),
    aabbFromCenter(-8.15, 0, 0.4, 12.6, pad),
    aabbFromCenter(8.15, 0, 0.4, 12.6, pad),
    aabbFromCenter(-4.9, 6.15, 6.8, 0.4, pad),
    aabbFromCenter(4.9, 6.15, 6.8, 0.4, pad),
    aabbFromCenter(0, -5.4, 4.8, 0.35, pad),
    aabbFromCenter(0, -3.4, 1.4, 1.1, pad),
    aabbFromCenter(-3.4, 0.35, 1.7, 1.5, pad),
    aabbFromCenter(3.4, 0.35, 1.7, 1.5, pad),
    aabbFromCenter(-3.4, 2.55, 1.7, 1.5, pad),
    aabbFromCenter(3.4, 2.55, 1.7, 1.5, pad),
    aabbFromCenter(-6.8, -2.2, 1.1, 1.6, pad),
    aabbFromCenter(6.8, -1.6, 1.4, 0.8, pad),
  ];
}

export function schoolInsideDoor(): { x: number; z: number } {
  return { x: 0, z: 5.6 };
}

export function schoolInsideSpawn(): { x: number; z: number } {
  return { x: 0, z: 3.2 };
}

export function schoolInsideBounds(): Aabb {
  return { minX: -8.05, maxX: 8.05, minZ: -6.05, maxZ: 6.45 };
}

export function yardReturnSpawn(spot: PlaySpotId): { x: number; z: number } {
  return yardSpawn(spot);
}

/** Walked out the doorway — send them back to the yard. */
export function leftInterior(spot: PlaySpotId, x: number, z: number): boolean {
  if (spot === "cottage") return z > 4.9 && Math.abs(x) < 1.4;
  return z > 5.9 && Math.abs(x) < 1.7;
}
