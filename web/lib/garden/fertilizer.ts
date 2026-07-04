import { FERTILIZER_COOLDOWN_MS } from "@/lib/garden/defaults";
import type { FarmPlot, GardenSnapshotV1 } from "@/lib/garden/types";

export function hasFertilizerUnlocked(snapshot: GardenSnapshotV1): boolean {
  return (snapshot.items.fertilizer ?? 0) >= 1;
}

export function isPlotTreated(plot: FarmPlot): boolean {
  if (plot.growMultiplier > 1) return true;
  return typeof plot.fertilizedAt === "number" && Number.isFinite(plot.fertilizedAt);
}

export function fertilizerCooldownRemainingMs(
  snapshot: GardenSnapshotV1,
  now = Date.now(),
): number {
  if (!hasFertilizerUnlocked(snapshot)) return 0;
  const lastUsed = snapshot.lastFertilizerUsedAt;
  if (typeof lastUsed !== "number" || !Number.isFinite(lastUsed)) return 0;
  return Math.max(0, FERTILIZER_COOLDOWN_MS - (now - lastUsed));
}

export function canUseFertilizer(snapshot: GardenSnapshotV1, now = Date.now()): boolean {
  return (
    hasFertilizerUnlocked(snapshot) &&
    fertilizerCooldownRemainingMs(snapshot, now) <= 0
  );
}

export function formatFertilizerCooldown(ms: number): string {
  if (ms <= 0) return "Ready!";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

export function unlockFertilizer(snapshot: GardenSnapshotV1): GardenSnapshotV1 {
  return {
    ...snapshot,
    items: { ...snapshot.items, fertilizer: 1 },
  };
}
