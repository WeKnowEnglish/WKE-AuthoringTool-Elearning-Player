import { describe, expect, it } from "vitest";
import { emptyGardenSnapshot } from "@/lib/garden/defaults";
import {
  allGrassPlotKeys,
  canPurchasePlotAt,
  countPurchasedGrassPlots,
  grassPlotCostByIndex,
  isPlotUnlocked,
  nextGrassPlotCost,
  normalizePurchasedPlotKeys,
  parsePlotKey,
  plotKey,
} from "@/lib/garden/plot-unlock";

describe("plot-unlock", () => {
  it("treats row 0 as always unlocked", () => {
    const snap = emptyGardenSnapshot();
    expect(isPlotUnlocked(snap, 0, 0)).toBe(true);
    expect(isPlotUnlocked(snap, 0, 3)).toBe(true);
  });

  it("locks grass cells until purchased", () => {
    const snap = emptyGardenSnapshot();
    expect(isPlotUnlocked(snap, 1, 0)).toBe(false);
    expect(isPlotUnlocked({ ...snap, purchasedPlotKeys: ["1,0"] }, 1, 0)).toBe(true);
    expect(isPlotUnlocked({ ...snap, purchasedPlotKeys: ["1,0"] }, 2, 0)).toBe(false);
  });

  it("computes doubling grass plot costs", () => {
    expect(grassPlotCostByIndex(0)).toBe(25);
    expect(grassPlotCostByIndex(1)).toBe(50);
    expect(grassPlotCostByIndex(2)).toBe(100);
    expect(grassPlotCostByIndex(11)).toBe(25 * 2 ** 11);
  });

  it("returns next cost from purchase count regardless of cell", () => {
    const snap = emptyGardenSnapshot();
    expect(nextGrassPlotCost(snap)).toBe(25);

    const one = { ...snap, purchasedPlotKeys: ["2,1"] };
    expect(nextGrassPlotCost(one)).toBe(50);

    const two = { ...snap, purchasedPlotKeys: ["2,1", "3,3"] };
    expect(nextGrassPlotCost(two)).toBe(100);
  });

  it("returns null when all grass plots are purchased", () => {
    const snap = { ...emptyGardenSnapshot(), purchasedPlotKeys: allGrassPlotKeys() };
    expect(countPurchasedGrassPlots(snap)).toBe(12);
    expect(nextGrassPlotCost(snap)).toBeNull();
    expect(canPurchasePlotAt(snap, 1, 0)).toBe(false);
  });

  it("rejects purchase on row 0 and already unlocked grass", () => {
    const snap = emptyGardenSnapshot();
    expect(canPurchasePlotAt(snap, 0, 0)).toBe(false);
    expect(canPurchasePlotAt({ ...snap, purchasedPlotKeys: ["1,1"] }, 1, 1)).toBe(false);
    expect(canPurchasePlotAt(snap, 1, 1)).toBe(true);
  });

  it("parses and validates plot keys", () => {
    expect(parsePlotKey("1,2")).toEqual({ row: 1, col: 2 });
    expect(parsePlotKey("bad")).toBeNull();
    expect(plotKey(1, 2)).toBe("1,2");
  });

  it("can grandfather legacy saves when explicitly requested", () => {
    expect(normalizePurchasedPlotKeys(undefined, true)).toEqual(allGrassPlotKeys());
  });

  it("defaults to empty purchasedPlotKeys for missing field", () => {
    expect(normalizePurchasedPlotKeys(undefined)).toEqual([]);
  });

  it("sanitizes explicit purchasedPlotKeys", () => {
    expect(normalizePurchasedPlotKeys(["1,0", "0,0", "nope", "9,9"])).toEqual(["1,0"]);
  });

  it("returns empty array for new saves when legacy grandfather is off", () => {
    expect(normalizePurchasedPlotKeys(undefined, false)).toEqual([]);
  });
});
