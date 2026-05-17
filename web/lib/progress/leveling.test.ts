import { describe, expect, it } from "vitest";
import {
  levelFromXp,
  levelsGainedBetween,
  totalXpForLevel,
  xpProgressInLevel,
  xpRequiredForLevel,
} from "./leveling";

describe("leveling curve", () => {
  it("level 1 starts at 0 xp", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(totalXpForLevel(1)).toBe(0);
    expect(xpRequiredForLevel(1)).toBe(100);
  });

  it("reaches level 2 at 100 xp", () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    const p = xpProgressInLevel(150);
    expect(p.level).toBe(2);
    expect(p.current).toBe(50);
  });

  it("reports levels gained between xp totals", () => {
    expect(levelsGainedBetween(0, 99)).toEqual([]);
    expect(levelsGainedBetween(0, 100)).toEqual([2]);
    expect(levelsGainedBetween(50, 250)).toEqual([2, 3]);
  });
});
