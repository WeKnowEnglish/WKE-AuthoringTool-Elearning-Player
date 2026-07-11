import { describe, expect, it } from "vitest";
import {
  canStartChallengePrefetch,
  isChallengePrefetchValid,
  LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS,
  LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS,
} from "@/lib/live-game/challenge-prefetch";

describe("challenge prefetch helpers", () => {
  const now = 100_000;

  it("accepts a fresh cache entry for the same node", () => {
    expect(
      isChallengePrefetchValid(
        {
          nodeId: "tree-01",
          expiresAt: now + 60_000,
        },
        "tree-01",
        now,
      ),
    ).toBe(true);
  });

  it("rejects stale cache entries near expiry", () => {
    expect(
      isChallengePrefetchValid(
        {
          nodeId: "tree-01",
          expiresAt: now + LIVE_GAME_CHALLENGE_PREFETCH_EXPIRY_BUFFER_MS,
        },
        "tree-01",
        now,
      ),
    ).toBe(false);
  });

  it("rejects cache entries while the node is on cooldown", () => {
    expect(
      isChallengePrefetchValid(
        {
          nodeId: "tree-01",
          expiresAt: now + 60_000,
        },
        "tree-01",
        now,
        { cooldownEndsAt: now + 5_000 },
      ),
    ).toBe(false);
  });

  it("rate-limits prefetch starts", () => {
    expect(canStartChallengePrefetch(now - LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS, now)).toBe(
      true,
    );
    expect(
      canStartChallengePrefetch(now - LIVE_GAME_CHALLENGE_PREFETCH_MIN_INTERVAL_MS + 1, now),
    ).toBe(false);
  });
});
