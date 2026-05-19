import { DECAY_PER_HOUR, MAX_DECAY_PER_READ } from "@/lib/pet/defaults";
import { clampMeter } from "@/lib/pet/care-actions";
import type { PetMeterId, PetSnapshotV1 } from "@/lib/pet/types";

export function decayAmountForElapsedMs(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const hours = elapsedMs / 3_600_000;
  return Math.min(MAX_DECAY_PER_READ, Math.floor(hours * DECAY_PER_HOUR));
}

export function applyDecay(snapshot: PetSnapshotV1, now: number): PetSnapshotV1 {
  const amount = decayAmountForElapsedMs(now - snapshot.lastUpdatedAt);
  if (amount <= 0) return snapshot;

  const meters = { ...snapshot.meters };
  for (const key of Object.keys(meters) as PetMeterId[]) {
    meters[key] = clampMeter(meters[key] - amount);
  }
  return { ...snapshot, meters, lastUpdatedAt: now };
}
