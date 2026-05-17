import { clampMotionTune } from "../part-motion-tune";
import { parsePivotPercent, type PivotPercent } from "../pivot-utils";
import { skeletonToParentMap, type SkeletonParentMap } from "../puppet-skeleton-utils";
import { PUPPET_PART_KEYS, type PuppetPartKey } from "../types";
import { AJ_PRESENTER_V1, type FrozenPuppetRigPreset } from "./aj-presenter-v1";
import type { PartMotionTune } from "../part-motion-tune";

export { AJ_PRESENTER_V1, type FrozenPuppetRigPreset } from "./aj-presenter-v1";

export const PUPPET_RIG_PRESETS: FrozenPuppetRigPreset[] = [AJ_PRESENTER_V1];

export function getPuppetRigPreset(id: string): FrozenPuppetRigPreset | null {
  return PUPPET_RIG_PRESETS.find((p) => p.id === id) ?? null;
}

export type RigPresetEditorState = {
  pivotPercents: Record<PuppetPartKey, PivotPercent>;
  partMotion: Record<PuppetPartKey, PartMotionTune>;
  skeletonParents: SkeletonParentMap;
};

export function rigPresetToEditorState(preset: FrozenPuppetRigPreset): RigPresetEditorState {
  const pivotPercents = {} as Record<PuppetPartKey, PivotPercent>;
  for (const part of PUPPET_PART_KEYS) {
    pivotPercents[part] = parsePivotPercent(preset.pivots[part] ?? "50% 50%");
  }
  const partMotion = {} as Record<PuppetPartKey, PartMotionTune>;
  for (const part of PUPPET_PART_KEYS) {
    partMotion[part] = clampMotionTune(preset.partMotion[part]);
  }
  return {
    pivotPercents,
    partMotion,
    skeletonParents: skeletonToParentMap(preset.skeleton),
  };
}
