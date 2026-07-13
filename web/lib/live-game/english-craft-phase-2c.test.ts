import { describe, expect, it } from "vitest";
import { sumTreesChopped } from "@/lib/live-game/hooks/useLiveGameVictoryStats";
import { canCompleteObjective } from "@/lib/live-game/server/read-storage";

describe("english-craft objective gates", () => {
  const readySession = {
    session: { phase: "playing" as const },
    unlockedObjects: { boat_boarding: true },
  };

  it("allows completion when boat boarding is unlocked", () => {
    expect(canCompleteObjective(readySession)).toBe(true);
  });

  it("blocks completion before boat craft unlocks boarding", () => {
    expect(
      canCompleteObjective({
        ...readySession,
        unlockedObjects: { boat_boarding: false },
      }),
    ).toBe(false);
  });

  it("blocks completion when session is not playing", () => {
    expect(
      canCompleteObjective({
        ...readySession,
        session: { phase: "lobby" as const },
      }),
    ).toBe(false);
  });
});

describe("english-craft victory stats", () => {
  it("sums collected tree counts", () => {
    expect(
      sumTreesChopped({
        "tree-01": {
          id: "tree-01",
          resourceType: "wood",
          available: true,
          cooldownEndsAt: null,
          collectedCount: 2,
        },
        "tree-02": {
          id: "tree-02",
          resourceType: "wood",
          available: false,
          cooldownEndsAt: 1,
          collectedCount: 3,
        },
      }),
    ).toBe(5);
  });
});
