import { describe, expect, it } from "vitest";
import { ENGLISH_CRAFT_RESOURCE_GOALS } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { resolveStorageFillLevel, readResourcePool } from "@/lib/live-game/resource-pool";

describe("english-craft phase 3e storage fill", () => {
  it("maps wood pool counts to empty, half, and full levels", () => {
    expect(resolveStorageFillLevel(0)).toBe("empty");
    expect(resolveStorageFillLevel(1)).toBe("half");
    expect(resolveStorageFillLevel(4)).toBe("half");
    expect(resolveStorageFillLevel(5)).toBe("full");
    expect(resolveStorageFillLevel(10)).toBe("full");
  });

  it("maps each resource type independently from pool counts", () => {
    const pool = readResourcePool({
      session: {} as never,
      players: {},
      resourcePool: { wood: 3, stone: 5, wheat: 0, cotton: 2 },
    });

    expect(resolveStorageFillLevel(pool.wood)).toBe("half");
    expect(resolveStorageFillLevel(pool.stone)).toBe("full");
    expect(resolveStorageFillLevel(pool.wheat)).toBe("empty");
    expect(resolveStorageFillLevel(pool.cotton)).toBe("half");
  });

  it("exposes HUD goal constants for all four resources", () => {
    expect(ENGLISH_CRAFT_RESOURCE_GOALS).toEqual({
      wood: 10,
      stone: 5,
      wheat: 5,
      cotton: 5,
    });
  });
});
