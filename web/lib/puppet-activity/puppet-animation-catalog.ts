import { PUPPET_MOTION_PRESETS } from "./animations";
import type { PuppetAnimationId } from "./types";
import { PUPPET_ANIMATION_IDS } from "./types";

export type PuppetAnimationOption = {
  id: PuppetAnimationId;
  label: string;
  /** Beat gesture (one-shot) vs idle loop only. */
  kind: "idle" | "gesture" | "none";
};

/** Options for presenter / dev preview dropdown (includes idle + none). */
export const PUPPET_ANIMATION_OPTIONS: PuppetAnimationOption[] = PUPPET_ANIMATION_IDS.map(
  (id) => {
    const preset = PUPPET_MOTION_PRESETS[id];
    const kind =
      id === "idle" ? "idle"
      : id === "none" ? "none"
      : "gesture";
    return {
      id,
      label: preset?.label ?? id,
      kind,
    };
  },
);

/** Beat gestures only (for script authoring hints). */
export const PUPPET_GESTURE_OPTIONS = PUPPET_ANIMATION_OPTIONS.filter(
  (o) => o.kind === "gesture",
);

export function labelForPuppetAnimation(id: PuppetAnimationId): string {
  return PUPPET_ANIMATION_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
