import type { LiveGameCraftGateSnapshot, LiveGameResourcePool, LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import {
  ENGLISH_CRAFT_CRAFT_COSTS,
  ENGLISH_CRAFT_STORAGE_FILL_THRESHOLDS,
  type StorageFillLevel,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";

export const EMPTY_LIVE_GAME_RESOURCE_POOL: LiveGameResourcePool = {
  wood: 0,
  stone: 0,
  wheat: 0,
  cotton: 0,
};

const CRAFT_RESOURCE_TYPES: LiveGameResourceType[] = ["wood", "stone", "wheat", "cotton"];

export function canAffordCraftCosts(
  pool: LiveGameResourcePool,
  costs: LiveGameResourcePool = ENGLISH_CRAFT_CRAFT_COSTS,
): boolean {
  return CRAFT_RESOURCE_TYPES.every((type) => pool[type] >= costs[type]);
}

export function missingCraftResources(
  pool: LiveGameResourcePool,
  costs: LiveGameResourcePool = ENGLISH_CRAFT_CRAFT_COSTS,
): LiveGameResourceType[] {
  return CRAFT_RESOURCE_TYPES.filter((type) => pool[type] < costs[type]);
}

export function formatMissingCraftResources(types: readonly LiveGameResourceType[]): string {
  if (types.length === 0) return "Team needs more resources for crafting.";
  if (types.length === 1) return `Need more ${types[0]} for crafting.`;
  const head = types.slice(0, -1).join(", ");
  const tail = types[types.length - 1];
  return `Need more ${head} and ${tail} for crafting.`;
}

export function readResourcePool(
  snapshot: LiveGameCraftGateSnapshot | null | undefined,
): LiveGameResourcePool {
  const pool = snapshot?.resourcePool;
  return {
    wood: pool?.wood ?? 0,
    stone: pool?.stone ?? 0,
    wheat: pool?.wheat ?? 0,
    cotton: pool?.cotton ?? 0,
  };
}

export function getPoolCount(
  snapshot: LiveGameCraftGateSnapshot | null | undefined,
  type: LiveGameResourceType,
): number {
  return readResourcePool(snapshot)[type];
}

export function resolveStorageFillLevel(
  count: number,
  thresholds = ENGLISH_CRAFT_STORAGE_FILL_THRESHOLDS,
): StorageFillLevel {
  if (count <= 0) return "empty";
  if (count >= thresholds.full) return "full";
  return "half";
}
