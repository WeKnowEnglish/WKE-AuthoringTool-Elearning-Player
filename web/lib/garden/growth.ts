import type { CropGrowthStage, FarmPlot, GardenSeedTier } from "@/lib/garden/types";

export const GROW_MS_BY_TIER: Record<GardenSeedTier, number> = {
  common: 60_000,
  bonus: 45_000,
};

export function growDurationMs(tier: GardenSeedTier, growMultiplier: number): number {
  const mult = growMultiplier > 0 ? growMultiplier : 1;
  return GROW_MS_BY_TIER[tier] / mult;
}

export function resolveGrowthStage(
  plot: FarmPlot,
  now: number,
  tier: GardenSeedTier,
): CropGrowthStage {
  if (!plot.seedId || plot.plantedAt == null) return "empty";
  const duration = growDurationMs(tier, plot.growMultiplier);
  const elapsed = now - plot.plantedAt;
  if (elapsed >= duration) return "ready";
  if (elapsed >= duration * 0.66) return "growing";
  return "sprout";
}

export function remainingGrowMs(
  plot: FarmPlot,
  tier: GardenSeedTier,
  now: number,
): number {
  if (!plot.plantedAt) return 0;
  const duration = growDurationMs(tier, plot.growMultiplier);
  return Math.max(0, duration - (now - plot.plantedAt));
}

export function formatGrowRemaining(ms: number): string {
  if (ms <= 0) return "Ready!";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}
