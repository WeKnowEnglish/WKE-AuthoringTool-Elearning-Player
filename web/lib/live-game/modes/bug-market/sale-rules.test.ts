import { describe, expect, it } from "vitest";
import { bugMarketCoinsForRarity, bugMarketNetRangePx, isNearBugMarketCounter, isNearBugMarketShop } from "@/lib/live-game/modes/bug-market/sale-rules";

describe("Bug Market sale rules", () => {
  it("requires a fresh position inside the counter approach", () => {
    expect(isNearBugMarketCounter({ x: 520, y: 560, updatedAt: 9_000 }, 10_000)).toBe(true);
    expect(isNearBugMarketCounter({ x: 520, y: 450, updatedAt: 9_000 }, 10_000)).toBe(false);
    expect(isNearBugMarketCounter({ x: 520, y: 560, updatedAt: 4_000 }, 10_000)).toBe(false);
  });

  it("awards more coins for rarer bugs", () => {
    expect(bugMarketCoinsForRarity("common")).toBeLessThan(bugMarketCoinsForRarity("uncommon"));
    expect(bugMarketCoinsForRarity("uncommon")).toBeLessThan(bugMarketCoinsForRarity("rare"));
  });

  it("requires the shop location and gives level two a longer catch range", () => {
    expect(isNearBugMarketShop({ x: 930, y: 560, updatedAt: 9_000 }, 10_000)).toBe(true);
    expect(isNearBugMarketShop({ x: 520, y: 560, updatedAt: 9_000 }, 10_000)).toBe(false);
    expect(bugMarketNetRangePx(2)).toBeGreaterThan(bugMarketNetRangePx(1));
  });
});
