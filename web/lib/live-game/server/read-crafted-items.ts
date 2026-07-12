import type { LiveGameCraftedItems, LiveGameCraftGateSnapshot } from "@/lib/live-game/liveblocks/config";

export const DEFAULT_LIVE_GAME_CRAFTED_ITEMS: LiveGameCraftedItems = {
  benchBuilt: false,
  hammers: 0,
  boat: false,
  bridge: false,
};

export function readCraftedItems(
  storage: LiveGameCraftGateSnapshot | null | undefined,
): LiveGameCraftedItems {
  const raw = storage?.craftedItems;
  return {
    benchBuilt: raw?.benchBuilt === true,
    hammers: Math.max(0, raw?.hammers ?? 0),
    boat: raw?.boat === true,
    bridge: raw?.bridge === true,
  };
}
