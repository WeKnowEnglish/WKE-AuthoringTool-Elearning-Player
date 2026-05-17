import type { TargetAndTransition, Transition } from "motion/react";
import type { PuppetAnimationId, PuppetPartKey } from "./types";

export type PartMotionSpec = {
  animate: TargetAndTransition | TargetAndTransition[];
  transition: Transition;
};

export type PuppetMotionPreset = {
  id: PuppetAnimationId;
  label: string;
  /** Per-layer idle loops while waiting or between one-shots. */
  partIdle?: Partial<Record<PuppetPartKey, PartMotionSpec>>;
  /** One-shot layered motion (e.g. wave, nod). */
  partOneShot?: Partial<Record<PuppetPartKey, PartMotionSpec>>;
};

/** CSS class per part — idle loops (see globals.css `.puppet-idle--*`). */
export const PUPPET_IDLE_CSS_CLASS: Partial<Record<PuppetPartKey, string>> = {
  body: "puppet-idle--body",
  head: "puppet-idle--head",
  upperArm: "puppet-idle--upper-arm",
  lowerArm: "puppet-idle--lower-arm",
  hand: "puppet-idle--hand",
};

export const PUPPET_MOTION_PRESETS: Record<
  Exclude<PuppetAnimationId, "none">,
  PuppetMotionPreset
> = {
  idle: {
    id: "idle",
    label: "Idle",
  },
  wave: {
    id: "wave",
    label: "Wave",
    partOneShot: {
      upperArm: {
        animate: { rotate: [0, -18, 22, -8, 0] },
        transition: { duration: 0.85, ease: "easeInOut" },
      },
      lowerArm: {
        animate: { rotate: [0, 8, -12, 4, 0] },
        transition: { duration: 0.85, ease: "easeInOut" },
      },
      hand: {
        animate: { rotate: [0, 6, -8, 0] },
        transition: { duration: 0.85, ease: "easeInOut" },
      },
    },
  },
  nod: {
    id: "nod",
    label: "Nod",
    partOneShot: {
      head: {
        animate: { rotate: [0, 10, 0] },
        transition: { duration: 0.45, ease: "easeInOut" },
      },
    },
  },
};

export function getMotionPreset(id: PuppetAnimationId): PuppetMotionPreset | null {
  if (id === "none") return null;
  return PUPPET_MOTION_PRESETS[id] ?? null;
}

export function getIdleCssClass(part: PuppetPartKey): string | null {
  return PUPPET_IDLE_CSS_CLASS[part] ?? null;
}

export function getDefaultPivot(part: PuppetPartKey): string {
  switch (part) {
    case "body":
      return "46% 69%";
    case "head":
      return "46% 40%";
    case "upperArm":
      return "55% 47%";
    case "lowerArm":
      return "69% 57%";
    case "hand":
      return "69% 43%";
    default:
      return "50% 50%";
  }
}
