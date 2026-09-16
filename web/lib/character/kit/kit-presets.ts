import { cloneHair } from "./hair-shell";
import { REFERENCE_KID_HAIR } from "./reference-kid-hair";
import type { KitHair, KitMouthExpression } from "./kit-types";

/**
 * Student hair ids from CHARACTER_ASSETS. Add a new style here as a hairline
 * + shell + tufts recipe — do not hand-author triangles.
 */

export const HAIR_KIT_PRESETS: Record<string, KitHair> = {
  hair_01: {
    hairlineY: 0.32,
    overshoot: 0.04,
    backBias: -0.08,
    tufts: [],
  },
  hair_02: cloneHair(REFERENCE_KID_HAIR),
  hair_03: {
    hairlineY: 0.28,
    overshoot: 0.03,
    backBias: -0.08,
    tufts: [
      { id: "bun_left", position: [-0.82, 0.34, -0.08], radius: 0.2, length: 0.08, tilt: [0, 0, 1.2] },
      { id: "bun_right", position: [0.82, 0.34, -0.08], radius: 0.2, length: 0.08, tilt: [0, 0, -1.2] },
    ],
  },
  hair_04: {
    hairlineY: 0.22,
    overshoot: 0.05,
    backBias: -0.06,
    tufts: [{ id: "long_back", position: [0, 0.08, -0.32], radius: 0.16, length: 0.42, tilt: [1.1, 0, 0] }],
  },
  hair_05: {
    hairlineY: 0.24,
    overshoot: 0.1,
    backBias: -0.04,
    tufts: [
      { id: "puff_c", position: [0, 0.72, 0], radius: 0.1, length: 0.18, tilt: [0.15, 0, 0] },
      { id: "puff_l", position: [-0.28, 0.58, 0.08], radius: 0.08, length: 0.14, tilt: [0.2, 0, 0.4] },
      { id: "puff_r", position: [0.28, 0.58, 0.08], radius: 0.08, length: 0.14, tilt: [0.2, 0, -0.4] },
    ],
  },
  hair_06: {
    hairlineY: 0.3,
    overshoot: 0.04,
    backBias: -0.05,
    tufts: [{ id: "sweep", position: [0.28, 0.42, 0.22], radius: 0.1, length: 0.22, tilt: [0.4, 0.6, -0.3] }],
  },
};

export const FACE_KIT_PRESETS: Record<
  string,
  { expression: KitMouthExpression; open: boolean; mouthWidth: number }
> = {
  face_01: { expression: "smile", open: false, mouthWidth: 1 },
  face_02: { expression: "cheer", open: false, mouthWidth: 1.22 },
  face_03: { expression: "wow", open: true, mouthWidth: 1 },
};

export function hairPreset(id: string): KitHair | null {
  const preset = HAIR_KIT_PRESETS[id];
  return preset ? cloneHair(preset) : null;
}

export function facePreset(id: string) {
  return FACE_KIT_PRESETS[id] ?? FACE_KIT_PRESETS.face_01!;
}
