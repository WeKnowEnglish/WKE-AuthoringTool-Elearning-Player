import { describe, expect, it } from "vitest";
import { readResourcePool, resolveStorageFillLevel } from "@/lib/live-game/resource-pool";

describe("live-game resource pool helpers", () => {
  it("normalizes partial pool snapshots", () => {
    expect(readResourcePool({ session: {} as never, players: {}, resourcePool: { wood: 2 } })).toEqual({
      wood: 2,
      stone: 0,
      wheat: 0,
      cotton: 0,
    });
  });

  it("resolves storage fill levels from counts", () => {
    expect(resolveStorageFillLevel(0)).toBe("empty");
    expect(resolveStorageFillLevel(1)).toBe("half");
    expect(resolveStorageFillLevel(4)).toBe("half");
    expect(resolveStorageFillLevel(5)).toBe("full");
  });
});
