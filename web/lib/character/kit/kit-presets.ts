import { cloneHair } from "./hair-shell";
import { REFERENCE_KID_HAIR } from "./reference-kid-hair";
import type { KitEyes, KitHair, KitMouth, KitMouthExpression, KitNose } from "./kit-types";

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
  hair_07: {
    hairlineY: 0.08,
    overshoot: 0.06,
    backBias: -0.12,
    tufts: [
      { id: "fringe_l", position: [-0.18, 0.42, 0.42], radius: 0.1, length: 0.12, tilt: [0.85, 0.15, 0.2] },
      { id: "fringe_c", position: [0, 0.4, 0.48], radius: 0.11, length: 0.14, tilt: [0.95, 0, 0] },
      { id: "fringe_r", position: [0.18, 0.42, 0.42], radius: 0.1, length: 0.12, tilt: [0.85, -0.15, -0.2] },
    ],
  },
  hair_08: {
    hairlineY: 0.18,
    overshoot: 0.12,
    backBias: -0.02,
    tufts: [],
  },
  hair_09: {
    hairlineY: 0.26,
    overshoot: 0.04,
    backBias: -0.1,
    tufts: [
      { id: "tail_left", position: [-0.72, 0.2, -0.12], radius: 0.1, length: 0.36, tilt: [0.9, 0, 1.0] },
      { id: "tail_right", position: [0.72, 0.2, -0.12], radius: 0.1, length: 0.36, tilt: [0.9, 0, -1.0] },
      { id: "crown", position: [0, 0.62, 0.02], radius: 0.08, length: 0.1, tilt: [0.2, 0, 0] },
    ],
  },
  hair_10: {
    hairlineY: 0.02,
    overshoot: 0.12,
    backBias: -0.18,
    tufts: [
      { id: "tuft_top", position: [0.04, 0.74, 0.06], radius: 0.11, length: 0.06, tilt: [0.55, 0, 0.15] },
      { id: "tuft_front", position: [0, 0.58, 0.22], radius: 0.09, length: 0.1, tilt: [0.55, 0, 0] },
      { id: "tuft_left", position: [-0.22, 0.64, 0.08], radius: 0.08, length: 0.12, tilt: [0.28, 0, 0.48] },
      { id: "tuft_right", position: [0.22, 0.64, 0.08], radius: 0.08, length: 0.12, tilt: [0.28, 0, -0.48] },
      { id: "tuft_back", position: [0, 0.62, -0.18], radius: 0.1, length: 0.1, tilt: [-0.35, 0, 0] },
    ],
  },
};

/** Student face look: expression + eye/nose/mouth layout on the vinyl skull. */
export type FaceKitPreset = {
  expression: KitMouthExpression;
  open: boolean;
  mouthWidth: number;
  eyes?: Partial<KitEyes>;
  nose?: Partial<KitNose>;
  mouth?: Partial<Pick<KitMouth, "height" | "forward">>;
};

export const FACE_KIT_PRESETS: Record<string, FaceKitPreset> = {
  face_01: {
    expression: "smile",
    open: false,
    mouthWidth: 1,
    eyes: { spacing: 0.54, size: 1.3, height: 0.04, forward: 0.56 },
    nose: { size: 0.78, height: -0.14, forward: 0.62 },
    mouth: { height: -0.38, forward: 0.58 },
  },
  face_02: {
    expression: "cheer",
    open: false,
    mouthWidth: 1.22,
    eyes: { spacing: 0.52, size: 1.28, height: 0.05, forward: 0.56 },
    nose: { size: 0.75, height: -0.13, forward: 0.61 },
    mouth: { height: -0.36, forward: 0.58 },
  },
  face_03: {
    expression: "wow",
    open: true,
    mouthWidth: 1,
    eyes: { spacing: 0.56, size: 1.38, height: 0.06, forward: 0.57 },
    nose: { size: 0.72, height: -0.12, forward: 0.6 },
    mouth: { height: -0.34, forward: 0.57 },
  },
  face_04: {
    expression: "smile",
    open: false,
    mouthWidth: 0.95,
    eyes: { spacing: 0.5, size: 1.48, height: 0.02, forward: 0.55 },
    nose: { size: 0.68, height: -0.15, forward: 0.6 },
    mouth: { height: -0.4, forward: 0.57 },
  },
  face_05: {
    expression: "smile",
    open: false,
    mouthWidth: 0.88,
    eyes: { spacing: 0.58, size: 1.12, height: 0.05, forward: 0.54 },
    nose: { size: 0.85, height: -0.14, forward: 0.63 },
    mouth: { height: -0.37, forward: 0.58 },
  },
  face_06: {
    expression: "cheer",
    open: false,
    mouthWidth: 1.35,
    eyes: { spacing: 0.48, size: 1.22, height: 0.08, forward: 0.56 },
    nose: { size: 0.7, height: -0.12, forward: 0.61 },
    mouth: { height: -0.35, forward: 0.59 },
  },
};

export function hairPreset(id: string): KitHair | null {
  const preset = HAIR_KIT_PRESETS[id];
  return preset ? cloneHair(preset) : null;
}

export function facePreset(id: string): FaceKitPreset {
  return FACE_KIT_PRESETS[id] ?? FACE_KIT_PRESETS.face_01!;
}
