import { WATERING_CAN_COOLDOWN_MS } from "@/lib/garden/defaults";
import type { GardenSnapshotV1 } from "@/lib/garden/types";

export function hasWateringCanUnlocked(snapshot: GardenSnapshotV1): boolean {
  return (snapshot.items.watering_can ?? 0) >= 1;
}

export function wateringCanCooldownRemainingMs(
  snapshot: GardenSnapshotV1,
  now = Date.now(),
): number {
  if (!hasWateringCanUnlocked(snapshot)) return 0;
  const lastUsed = snapshot.lastWateringCanUsedAt;
  if (typeof lastUsed !== "number" || !Number.isFinite(lastUsed)) return 0;
  return Math.max(0, WATERING_CAN_COOLDOWN_MS - (now - lastUsed));
}

export function canUseWateringCan(snapshot: GardenSnapshotV1, now = Date.now()): boolean {
  return (
    hasWateringCanUnlocked(snapshot) &&
    wateringCanCooldownRemainingMs(snapshot, now) <= 0
  );
}

export function formatWateringCanCooldown(ms: number): string {
  if (ms <= 0) return "Ready!";
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

export function unlockWateringCan(snapshot: GardenSnapshotV1): GardenSnapshotV1 {
  return {
    ...snapshot,
    items: { ...snapshot.items, watering_can: 1 },
  };
}
