import { nearPoint } from "./play-move";

/** Teacher desk approach — stand south of the front desk. */
export const SCHOOL_DESK = { x: 0, z: -2.2 };
export const SCHOOL_BOARD = { x: 0, z: -4.6 };
export const SCHOOL_SPECIAL_RADIUS = 1.7;

export type SchoolSpecialId = "desk" | "board";

export function nearestSchoolSpecial(x: number, z: number): SchoolSpecialId | null {
  if (nearPoint(x, z, SCHOOL_DESK.x, SCHOOL_DESK.z, SCHOOL_SPECIAL_RADIUS)) return "desk";
  if (nearPoint(x, z, SCHOOL_BOARD.x, SCHOOL_BOARD.z, SCHOOL_SPECIAL_RADIUS)) return "board";
  return null;
}
