"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useSelf } from "@liveblocks/react/suspense";
import type { LiveGamePlayerCarry, LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import { readPlayerCarryBag } from "@/lib/live-game/carry-bag";
import { readResourcePool } from "@/lib/live-game/resource-pool";
import { readCraftedItems } from "@/lib/live-game/server/read-crafted-items";
import { readPlayerHunger } from "@/lib/live-game/server/read-player-hunger";
import { readPlayerInventory } from "@/lib/live-game/server/read-player-inventory";

function readSnapshot(root: unknown): LiveGameStorageSnapshot {
  return root as LiveGameStorageSnapshot;
}

export function useLiveGameResourcePool() {
  return useStorage((root) => readResourcePool(readSnapshot(root)));
}

/** @deprecated Use useLiveGameResourcePool */
export const useLiveGameFullResourcePool = useLiveGameResourcePool;

export function useLiveGameResourceNodes() {
  return useStorage((root) => readSnapshot(root).resourceNodes ?? {});
}

export function useLiveGameCraftedItems() {
  return useStorage((root) => readCraftedItems(readSnapshot(root)));
}

export function useLiveGameBoatBoardingUnlocked() {
  return useStorage((root) => readSnapshot(root).unlockedObjects?.boat_boarding === true);
}

export function useLiveGamePlayerCarry(playerId: string | null | undefined) {
  return useStorage((root) => {
    if (!playerId) return null;
    return readPlayerCarryBag(readSnapshot(root), playerId);
  });
}

export function useLiveGameSelfCarry(): LiveGamePlayerCarry | null {
  const self = useSelf();
  return useLiveGamePlayerCarry(self?.id ?? null);
}

export function useLiveGamePlayerInventory(playerId: string | null | undefined) {
  return useStorage((root) => readPlayerInventory(readSnapshot(root), playerId ?? ""));
}

export function useLiveGameSelfInventory() {
  const self = useSelf();
  return useLiveGamePlayerInventory(self?.id ?? null);
}

export function useLiveGamePlayerHunger(playerId: string | null | undefined) {
  return useStorage((root) => readPlayerHunger(readSnapshot(root), playerId ?? ""));
}

export function useLiveGameSelfHunger() {
  const self = useSelf();
  return useLiveGamePlayerHunger(self?.id ?? null);
}
