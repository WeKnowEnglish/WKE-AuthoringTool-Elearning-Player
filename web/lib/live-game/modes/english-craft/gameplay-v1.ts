/** English Craft v0.1 pilot numbers (Phase 2A–2B). */

export const ENGLISH_CRAFT_WOOD_GOAL = 10;
export const ENGLISH_CRAFT_CRAFT_WOOD_COST = 10;
export const ENGLISH_CRAFT_TREE_COOLDOWN_MS = 30_000;
export const ENGLISH_CRAFT_TREE_INTERACT_RADIUS_PX = 64;
export const ENGLISH_CRAFT_BENCH_INTERACT_RADIUS_PX = 64;
export const ENGLISH_CRAFT_CHALLENGE_TTL_MS = 60_000;

export const ENGLISH_CRAFT_CRAFT_BENCH_ID = "craft-bench-01";
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
