import type { CharacterBodyRig, CharacterSocket, Vec3 } from "./character-types";

/**
 * Shared attach map. Units match Shape Builder Boy 1 after its 0.84 scale
 * (~4.9 tall, origin at the feet) so studio GLBs drop in without a huge rescale.
 */
export const DEFAULT_BODY_ID = "body_01";

const CLASSIC_SOCKETS: Record<CharacterSocket, Vec3> = {
  origin: [0, 0, 0],
  feet: [0, 0.18, 0.18],
  hips: [0, 1.55, 0],
  chest: [0, 2.55, 0],
  neck: [0, 3.18, 0],
  head: [0, 3.72, 0],
  face: [0, 3.74, 0.66],
  back: [0, 2.58, -0.42],
};

function scaleSockets(
  sockets: Record<CharacterSocket, Vec3>,
  scale: number,
): Record<CharacterSocket, Vec3> {
  const next = {} as Record<CharacterSocket, Vec3>;
  for (const key of Object.keys(sockets) as CharacterSocket[]) {
    const [x, y, z] = sockets[key];
    next[key] = [x * scale, y * scale, z * scale];
  }
  return next;
}

export const CHARACTER_BODY_RIGS: Record<string, CharacterBodyRig> = {
  body_01: {
    id: "body_01",
    name: "Classic",
    sockets: CLASSIC_SOCKETS,
    height: 4.9,
    partScale: 1,
  },
  body_02: {
    id: "body_02",
    name: "Tall",
    sockets: scaleSockets(CLASSIC_SOCKETS, 1.1),
    height: 5.4,
    partScale: 1.1,
  },
  body_03: {
    id: "body_03",
    name: "Compact",
    sockets: scaleSockets(CLASSIC_SOCKETS, 0.9),
    height: 4.4,
    partScale: 0.9,
  },
};

export function getBodyRig(bodyId: string): CharacterBodyRig {
  return CHARACTER_BODY_RIGS[bodyId] ?? CHARACTER_BODY_RIGS[DEFAULT_BODY_ID];
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
