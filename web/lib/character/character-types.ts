export const CHARACTER_CATEGORIES = [
  "body",
  "hair",
  "face",
  "top",
  "bottom",
  "shoes",
  "accessory",
] as const;

export type CharacterCategory = (typeof CHARACTER_CATEGORIES)[number];

export const CHARACTER_SOCKETS = [
  "origin",
  "feet",
  "hips",
  "chest",
  "neck",
  "head",
  "face",
  "back",
] as const;

export type CharacterSocket = (typeof CHARACTER_SOCKETS)[number];

export type CharacterTintChannel = "skin" | "hair" | "top" | "bottom" | "shoes" | "none";

export type CharacterAlign = "center" | "bottom" | "top";

export type Vec3 = [number, number, number];

/**
 * Saved student avatar. IDs refer to registry rows, never meshes.
 * Compatible with future Shape Builder GLB parts that share those IDs.
 */
export type CharacterConfig = {
  body: string;
  skinColor: string;
  hair: string;
  hairColor: string;
  face: string;
  top: string;
  topColor: string;
  bottom: string;
  bottomColor?: string;
  shoes: string;
  shoeColor?: string;
  accessory: string | null;
};

export type CharacterPartFit = {
  socket: CharacterSocket;
  offset?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  tint: CharacterTintChannel;
  /**
   * How a studio GLB is pinned to the socket after auto-centering.
   * Procedural recipes are authored at the attach point and ignore this.
   */
  align?: CharacterAlign;
  /** Optional height to scale a studio mesh to, in character units. */
  targetHeight?: number;
};

/**
 * Shape Builder export hook.
 * Export a named group as GLB, drop it at `src`, and the editor will
 * modulate it onto the shared body sockets.
 */
export type CharacterStudioSource = {
  kind: "glb";
  src: string;
  /** Named group from the GLB (Shape Builder group name). */
  objectName?: string;
};

export type CharacterPartDef = {
  id: string;
  name: string;
  category: CharacterCategory;
  fit: CharacterPartFit;
  recipe?: string;
  studio?: CharacterStudioSource;
  unlock?: "free";
};

export type CharacterSwatch = {
  id: string;
  name: string;
  hex: string;
};

export type CharacterBodyRig = {
  id: string;
  name: string;
  sockets: Record<CharacterSocket, Vec3>;
  height: number;
  partScale: number;
};
