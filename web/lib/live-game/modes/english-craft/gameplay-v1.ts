/** English Craft v0.1 pilot numbers (Phase 2A–2B). */

import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";

export const ENGLISH_CRAFT_WOOD_GOAL = 10;
/** @deprecated Use ENGLISH_CRAFT_CRAFT_COSTS.wood */
export const ENGLISH_CRAFT_CRAFT_WOOD_COST = ENGLISH_CRAFT_WOOD_GOAL;

export const ENGLISH_CRAFT_RESOURCE_GOALS = {
  wood: ENGLISH_CRAFT_WOOD_GOAL,
  stone: 5,
  wheat: 5,
  cotton: 5,
} as const;

export const ENGLISH_CRAFT_CRAFT_COSTS = ENGLISH_CRAFT_RESOURCE_GOALS;

export const ENGLISH_CRAFT_STORAGE_FILL_THRESHOLDS = {
  half: 1,
  full: 5,
} as const;

export type StorageFillLevel = "empty" | "half" | "full";

export const ENGLISH_CRAFT_TREE_COOLDOWN_MS = 30_000;
export const ENGLISH_CRAFT_TREE_INTERACT_RADIUS_PX = 64;
export const ENGLISH_CRAFT_BENCH_INTERACT_RADIUS_PX = 64;
export const ENGLISH_CRAFT_STORAGE_INTERACT_RADIUS_PX = 72;
export const ENGLISH_CRAFT_CHALLENGE_TTL_MS = 60_000;

export const ENGLISH_CRAFT_CRAFT_BENCH_ID = "craft-bench-01";
export const ENGLISH_CRAFT_BOAT_HAMMER_GOAL = 5;
export const ENGLISH_CRAFT_HAMMER_COSTS = { wood: 2, stone: 2 } as const;
export const ENGLISH_CRAFT_BOAT_POOL_COSTS = { wood: 20, cotton: 10 } as const;
export const ENGLISH_CRAFT_CRAFT_QUESTION_ID = "craft-bridge-v1";
export const ENGLISH_CRAFT_FLAG_ID = "flag-01";
export const ENGLISH_CRAFT_FLAG_ZONE_SIZE_PX = 80;

export type EnglishCraftResourceNodeSnapshot = {
  available: boolean;
  cooldownEndsAt: number | null;
};

/** Cooldown time is authoritative; stale `available: false` after expiry is ignored. */
export function isEnglishCraftResourceNodeInteractable(
  node: EnglishCraftResourceNodeSnapshot | undefined,
  now = Date.now(),
): boolean {
  if (!node) return false;
  if (node.cooldownEndsAt != null && node.cooldownEndsAt > now) return false;
  return true;
}

export function harvestInteractLabel(resourceType: LiveGameResourceType, label: string): string {
  switch (resourceType) {
    case "wood":
      return `Chop ${label}`;
    case "stone":
      return `Mine ${label}`;
    case "wheat":
      return `Harvest ${label}`;
    case "cotton":
      return `Pick ${label}`;
    default:
      return `Gather ${label}`;
  }
}

export function harvestMcModalTitle(resourceType: LiveGameResourceType): string {
  switch (resourceType) {
    case "wood":
      return "Gather wood — vocab check";
    case "stone":
      return "Gather stone — vocab check";
    case "wheat":
      return "Gather wheat — vocab check";
    case "cotton":
      return "Gather cotton — vocab check";
    default:
      return "Gather resource — vocab check";
  }
}

export function depositInteractLabel(resourceType: LiveGameResourceType): string {
  switch (resourceType) {
    case "wood":
      return "Deposit wood";
    case "stone":
      return "Deposit stone";
    case "wheat":
      return "Deposit wheat";
    case "cotton":
      return "Deposit cotton";
    default:
      return "Deposit resource";
  }
}

export function depositSpellModalTitle(resourceType: LiveGameResourceType): string {
  switch (resourceType) {
    case "wood":
      return "Deposit wood — spell the word";
    case "stone":
      return "Deposit stone — spell the word";
    case "wheat":
      return "Deposit wheat — spell the word";
    case "cotton":
      return "Deposit cotton — spell the word";
    default:
      return "Deposit — spell the word";
  }
}
