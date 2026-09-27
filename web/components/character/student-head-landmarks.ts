import type { Vec3 } from "@/lib/character/character-types";

/** Local space of the toy head. Origin is the head center. */
export const HEAD_RADIUS = 0.74;

export const HEAD_LANDMARKS = {
  leftEye: [-0.24, 0.08, 0.5] as Vec3,
  rightEye: [0.24, 0.08, 0.5] as Vec3,
  nose: [0, -0.1, 0.56] as Vec3,
  mouth: [0, -0.3, 0.5] as Vec3,
  leftEar: [-0.76, 0.04, -0.1] as Vec3,
  rightEar: [0.76, 0.04, -0.1] as Vec3,
  neck: [0, -0.73, 0.12] as Vec3,
} as const;
