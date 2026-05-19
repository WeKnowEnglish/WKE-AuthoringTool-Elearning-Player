export {
  applyLoadoutToSvgRoot,
  avatarAriaLabel,
  itemGroupId,
  normalizeLoadout,
  resolveEquippedGroupIds,
  STUDENT_AVATAR_SVG_PATH,
} from "@/lib/avatar/apply-loadout";
export {
  AVATAR_PRESETS,
  AVATAR_PRESET_LOADOUTS,
  DEFAULT_AVATAR_LOADOUT,
  LEGACY_PRESET_ALIASES,
  loadoutForPreset,
  resolvePresetId,
} from "@/lib/avatar/defaults";
export { shouldHideBaseFace } from "@/lib/avatar/apply-loadout";
export type { ApplyAvatarOptions } from "@/lib/avatar/apply-loadout";
export {
  growthStageForPreset,
  robotGrowthGroupId,
  robotGrowthLabel,
  robotGrowthStage,
  ROBOT_GROWTH_LABELS,
  type RobotGrowthStage,
} from "@/lib/avatar/growth";
export { presetIdForLoadout, resolveAvatarLoadout } from "@/lib/avatar/progress";
export type { AvatarLoadout, AvatarPresetId, AvatarSlot } from "@/lib/avatar/types";
