import { cloneHair, REFERENCE_KID_HAIR_SHELL } from "./hair-shell";
import type { KitHair } from "./kit-types";

/** Hair shell + one crown tuft from the simple-head reference sheet. */
export const REFERENCE_KID_HAIR: KitHair = {
  hairlineY: 0.02,
  overshoot: 0.08,
  backBias: -0.2,
  shell: REFERENCE_KID_HAIR_SHELL.map((ring) => ({ ...ring })),
  tufts: [{ id: "tuft_top", position: [0.04, 0.74, 0.06], radius: 0.11, length: 0.04, tilt: [0.6, 0, 0.2] }],
};

export function referenceKidHair(): KitHair {
  return cloneHair(REFERENCE_KID_HAIR);
}
