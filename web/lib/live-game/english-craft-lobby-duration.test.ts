import { describe, expect, it } from "vitest";
import {
  ENGLISH_CRAFT_DURATION_OPTIONS,
  ENGLISH_CRAFT_MODE,
  ENGLISH_CRAFT_UNLIMITED_DURATION,
  formatEnglishCraftDurationSelectValue,
  isUnlimitedEnglishCraftDuration,
  normalizeEnglishCraftDurationMinutes,
  parseEnglishCraftDurationSelectValue,
} from "@/lib/live-game/modes/english-craft/config";

describe("normalizeEnglishCraftDurationMinutes", () => {
  it("accepts each lobby duration option", () => {
    expect(ENGLISH_CRAFT_DURATION_OPTIONS).toEqual([1, 2, 5, 10, 15, 20, 30]);
    for (const minutes of ENGLISH_CRAFT_DURATION_OPTIONS) {
      expect(normalizeEnglishCraftDurationMinutes(minutes)).toBe(minutes);
    }
  });

  it("rounds before matching", () => {
    expect(normalizeEnglishCraftDurationMinutes(14.6)).toBe(15);
  });

  it("falls back to default for unsupported values", () => {
    expect(normalizeEnglishCraftDurationMinutes(25)).toBe(ENGLISH_CRAFT_MODE.defaultDurationMinutes);
    expect(normalizeEnglishCraftDurationMinutes(0)).toBe(ENGLISH_CRAFT_MODE.defaultDurationMinutes);
  });
});

describe("english craft session duration select", () => {
  it("round-trips timed options", () => {
    for (const minutes of ENGLISH_CRAFT_DURATION_OPTIONS) {
      const value = formatEnglishCraftDurationSelectValue(minutes);
      expect(parseEnglishCraftDurationSelectValue(value)).toBe(minutes);
    }
  });

  it("round-trips unlimited duration", () => {
    expect(formatEnglishCraftDurationSelectValue(ENGLISH_CRAFT_UNLIMITED_DURATION)).toBe("unlimited");
    expect(parseEnglishCraftDurationSelectValue("unlimited")).toBe(ENGLISH_CRAFT_UNLIMITED_DURATION);
    expect(isUnlimitedEnglishCraftDuration(ENGLISH_CRAFT_UNLIMITED_DURATION)).toBe(true);
  });
});
