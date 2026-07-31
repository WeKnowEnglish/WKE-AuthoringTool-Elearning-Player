import type {
  BugMarketPlayerState,
  BugMarketRarity,
  BugMarketWorldBug,
} from "@/lib/live-game/modes/bug-market/state";
import { BUG_MARKET_STARTING_CAPACITY } from "@/lib/live-game/modes/bug-market/state";
import { bugMarketNetRangePx } from "@/lib/live-game/modes/bug-market/sale-rules";

export const BUG_MARKET_STARTER_NET_RANGE_PX = 125;
export const BUG_MARKET_SWING_COOLDOWN_MS = 700;
export const BUG_MARKET_POSITION_MAX_AGE_MS = 5_000;

const CATCH_CHANCE: Record<BugMarketRarity, number> = {
  common: 0.96,
  uncommon: 0.78,
  rare: 0.58,
};

export type BugMarketCatchValidation =
  | { ok: true; distancePx: number }
  | { ok: false; reason: "bug_unavailable" | "display_case_full" | "cooldown" | "position_stale" | "out_of_range" };

export function validateBugMarketCatch(input: {
  bug: BugMarketWorldBug;
  player: BugMarketPlayerState;
  position: { x: number; y: number; updatedAt: number } | null;
  now: number;
}): BugMarketCatchValidation {
  if (input.bug.state !== "available") return { ok: false, reason: "bug_unavailable" };
  if (input.player.inventory.length >= BUG_MARKET_STARTING_CAPACITY) {
    return { ok: false, reason: "display_case_full" };
  }
  if (
    input.player.lastSwingAt !== null &&
    input.now - input.player.lastSwingAt < BUG_MARKET_SWING_COOLDOWN_MS
  ) {
    return { ok: false, reason: "cooldown" };
  }
  if (!input.position || input.now - input.position.updatedAt > BUG_MARKET_POSITION_MAX_AGE_MS) {
    return { ok: false, reason: "position_stale" };
  }
  const distancePx = Math.hypot(input.bug.x - input.position.x, input.bug.y - input.position.y);
  if (distancePx > bugMarketNetRangePx(input.player.netLevel)) {
    return { ok: false, reason: "out_of_range" };
  }
  return { ok: true, distancePx };
}

function stableUnitInterval(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x1_0000_0000;
}

export function doesBugMarketCatchSucceed(input: {
  clientActionId: string;
  bug: Pick<BugMarketWorldBug, "id" | "rarity">;
}): boolean {
  return stableUnitInterval(`${input.clientActionId}:${input.bug.id}`) < CATCH_CHANCE[input.bug.rarity];
}
