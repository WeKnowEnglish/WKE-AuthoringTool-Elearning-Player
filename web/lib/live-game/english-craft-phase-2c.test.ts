import { describe, expect, it } from "vitest";
import { isPlayerTouchingFlagZone } from "@/lib/live-game/engine/flag-touch";
import { ENGLISH_CRAFT_FLAG_ZONE_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { getEnglishCraftCollisionRects, ENGLISH_CRAFT_RIVER_COLLISION_RECT_COUNT } from "@/lib/live-game/modes/english-craft/map-v1";
import { sumTreesChopped } from "@/lib/live-game/hooks/useLiveGameVictoryStats";
import { canCompleteObjective } from "@/lib/live-game/server/read-storage";

describe("english-craft flag touch", () => {
  it("detects overlap inside the flag zone", () => {
    const insideX = ENGLISH_CRAFT_FLAG_ZONE_V1.x + 8;
    const insideY = ENGLISH_CRAFT_FLAG_ZONE_V1.y + 8;
    expect(isPlayerTouchingFlagZone(insideX, insideY, ENGLISH_CRAFT_FLAG_ZONE_V1)).toBe(true);
  });

  it("does not detect overlap far from the flag zone", () => {
    expect(isPlayerTouchingFlagZone(0, 0, ENGLISH_CRAFT_FLAG_ZONE_V1)).toBe(false);
  });
});

describe("english-craft objective gates", () => {
  const readySession = {
    session: { phase: "playing" as const },
    craftedItems: { bridge: true },
    unlockedObjects: { river_crossing: true },
  };

  it("allows completion when bridge is crafted and river is open", () => {
    expect(canCompleteObjective(readySession)).toBe(true);
  });

  it("blocks completion before bridge craft", () => {
    expect(
      canCompleteObjective({
        ...readySession,
        craftedItems: { bridge: false },
        unlockedObjects: { river_crossing: false },
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

describe("english-craft bridge collision unlock", () => {
  it("removes river water tiles when the river crossing is unlocked", () => {
    const locked = getEnglishCraftCollisionRects(false);
    const unlocked = getEnglishCraftCollisionRects(true);
    expect(unlocked.length).toBeLessThan(locked.length);
    expect(locked.length - unlocked.length).toBe(ENGLISH_CRAFT_RIVER_COLLISION_RECT_COUNT);
  });
});
