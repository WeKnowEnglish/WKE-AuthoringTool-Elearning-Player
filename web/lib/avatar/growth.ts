import type { AvatarPresetId } from "@/lib/avatar/types";

export type RobotGrowthStage = 1 | 2 | 3 | 4 | 5;

/** Minimum player level for each growth stage (stage 5 = level 15+). */
export const ROBOT_GROWTH_LEVEL_THRESHOLDS: readonly [1, 3, 6, 10, 15] = [1, 3, 6, 10, 15];

export const ROBOT_GROWTH_LABELS: Record<RobotGrowthStage, string> = {
  1: "Spark unit",
  2: "Builder bot",
  3: "Ranger bot",
  4: "Guardian bot",
  5: "Prime bot",
};

export function robotGrowthStage(playerLevel: number): RobotGrowthStage {
  const level = Math.max(1, Math.floor(playerLevel));
  if (level >= 15) return 5;
  if (level >= 10) return 4;
  if (level >= 6) return 3;
  if (level >= 3) return 2;
  return 1;
}

export function robotGrowthGroupId(stage: RobotGrowthStage): string {
  return `item-robot-growth-${stage}`;
}

export function robotGrowthLabel(stage: RobotGrowthStage): string {
  return ROBOT_GROWTH_LABELS[stage];
}

/** Player level → growth stage for presets that support growth (robot only for now). */
export function growthStageForPreset(
  presetId: AvatarPresetId | null | undefined,
  playerLevel: number,
): RobotGrowthStage | null {
  if (presetId === "robot") return robotGrowthStage(playerLevel);
  return null;
}
