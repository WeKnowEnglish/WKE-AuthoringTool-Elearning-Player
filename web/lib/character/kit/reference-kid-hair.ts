import { cloneHair, REFERENCE_KID_HAIR_SHELL } from "./hair-shell";
import type { KitHair } from "./kit-types";

/** Hair shell + one crown tuft — snug beanie, not a moppy helmet. */
export const REFERENCE_KID_HAIR: KitHair = {
  hairlineY: 0.04,
  overshoot: 0.04,
  backBias: -0.06,
  shell: REFERENCE_KID_HAIR_SHELL.map((ring) => ({ ...ring })),
  tufts: [{ id: "tuft_top", position: [0.02, 0.68, 0.06], radius: 0.06, length: 0.05, tilt: [0.5, 0, 0.1] }],
};

export function referenceKidHair(): KitHair {
  return cloneHair(REFERENCE_KID_HAIR);
}
