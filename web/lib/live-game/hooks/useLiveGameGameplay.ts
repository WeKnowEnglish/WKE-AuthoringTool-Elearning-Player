"use client";

import { useStorage } from "@liveblocks/react/suspense";
import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";

function readSnapshot(root: unknown): LiveGameStorageSnapshot {
  return root as LiveGameStorageSnapshot;
}

export function useLiveGameResourcePool() {
  return useStorage((root) => readSnapshot(root).resourcePool?.wood ?? 0);
}

export function useLiveGameResourceNodes() {
  return useStorage((root) => readSnapshot(root).resourceNodes ?? {});
}

export function useLiveGameBridgeCrafted() {
  return useStorage((root) => readSnapshot(root).craftedItems?.bridge === true);
}

export function useLiveGameRiverCrossingUnlocked() {
  return useStorage((root) => readSnapshot(root).unlockedObjects?.river_crossing === true);
}
