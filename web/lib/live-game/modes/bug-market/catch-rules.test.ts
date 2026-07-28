import { describe, expect, it } from "vitest";
import {
  BUG_MARKET_STARTER_NET_RANGE_PX,
  BUG_MARKET_SWING_COOLDOWN_MS,
  doesBugMarketCatchSucceed,
  validateBugMarketCatch,
} from "@/lib/live-game/modes/bug-market/catch-rules";
import {
  BUG_MARKET_STARTER_BUGS,
  BUG_MARKET_STARTING_CAPACITY,
  createBugMarketPlayerState,
} from "@/lib/live-game/modes/bug-market/state";

const bug = BUG_MARKET_STARTER_BUGS[0]!;

describe("Bug Market catch rules", () => {
  it("accepts an available nearby bug with fresh position", () => {
    const result = validateBugMarketCatch({
      bug,
      player: createBugMarketPlayerState("player-1"),
      position: { x: bug.x + BUG_MARKET_STARTER_NET_RANGE_PX - 1, y: bug.y, updatedAt: 10_000 },
      now: 10_000,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects out-of-range, cooldown, stale-position, and full-case requests", () => {
    const player = createBugMarketPlayerState("player-1");
    const far = validateBugMarketCatch({
      bug,
      player,
      position: { x: bug.x + BUG_MARKET_STARTER_NET_RANGE_PX + 1, y: bug.y, updatedAt: 10_000 },
      now: 10_000,
    });
    expect(far).toEqual({ ok: false, reason: "out_of_range" });

    const cooldown = validateBugMarketCatch({
      bug,
      player: { ...player, lastSwingAt: 10_000 - BUG_MARKET_SWING_COOLDOWN_MS + 1 },
      position: { x: bug.x, y: bug.y, updatedAt: 10_000 },
      now: 10_000,
    });
    expect(cooldown).toEqual({ ok: false, reason: "cooldown" });

    const stale = validateBugMarketCatch({
      bug,
      player,
      position: { x: bug.x, y: bug.y, updatedAt: 0 },
      now: 10_000,
    });
    expect(stale).toEqual({ ok: false, reason: "position_stale" });

    const full = validateBugMarketCatch({
      bug,
      player: {
        ...player,
        inventory: Array.from({ length: BUG_MARKET_STARTING_CAPACITY }, (_, index) => ({
          id: `item-${index}`,
          speciesId: "ant",
          rarity: "common" as const,
          caughtAt: index,
        })),
      },
      position: { x: bug.x, y: bug.y, updatedAt: 10_000 },
      now: 10_000,
    });
    expect(full).toEqual({ ok: false, reason: "display_case_full" });
  });

  it("resolves identical action ids deterministically", () => {
    const input = { clientActionId: "repeatable-action", bug };
    expect(doesBugMarketCatchSucceed(input)).toBe(doesBugMarketCatchSucceed(input));
  });
});
