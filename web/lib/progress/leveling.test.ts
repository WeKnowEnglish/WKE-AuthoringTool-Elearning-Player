import { describe, expect, it } from "vitest";
import {
  levelFromXp,
  levelsGainedBetween,
  MAX_PLAYER_LEVEL,
  totalXpForLevel,
  xpProgressInLevel,
  xpRequiredForLevel,
} from "./leveling";

describe("leveling curve", () => {
  it("level 1 starts at 0 xp", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(totalXpForLevel(1)).toBe(0);
    expect(xpRequiredForLevel(1)).toBe(50);
  });

  it("reaches level 2 at 50 xp", () => {
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
    const p = xpProgressInLevel(75);
    expect(p.level).toBe(2);
    expect(p.current).toBe(25);
  });

  it("reports levels gained between xp totals", () => {
    expect(levelsGainedBetween(0, 49)).toEqual([]);
    expect(levelsGainedBetween(0, 50)).toEqual([2]);
    expect(levelsGainedBetween(25, 180)).toEqual([2, 3, 4]);
  });

  it("caps level at MAX_PLAYER_LEVEL", () => {
    expect(levelFromXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_PLAYER_LEVEL);
  });
});
