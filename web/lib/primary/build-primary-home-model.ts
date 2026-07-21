import { xpProgressInLevel } from "@/lib/progress/leveling";
import { getPlayerLevel, getRewards, type RewardsSnapshot } from "@/lib/progress/rewards";

export type PrimaryEconomyFields = {
  studentName: string;
  avatarInitials: string;
  level: number;
  levelProgress: number;
  gold: number;
};

export function initialsFromDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/** Live economy + identity fields for the primary dashboard (Phase 0). */
export function buildPrimaryEconomyModel(
  displayName: string | null | undefined,
  rewards: RewardsSnapshot = getRewards(),
): PrimaryEconomyFields {
  const name = displayName?.trim() || "Student";
  const progress = xpProgressInLevel(rewards.experience);
  return {
    studentName: name,
    avatarInitials: initialsFromDisplayName(name),
    level: getPlayerLevel(rewards),
    levelProgress: progress.percent / 100,
    gold: rewards.gold,
  };
}
