import { describe, expect, it } from "vitest";
import {
  buildInitialLetterMixupSlots,
  buildLetterMixupLayout,
  normalizeLetterMixupTarget,
} from "./letter-mixup-layout";

describe("letter-mixup-layout", () => {
  it("normalizes whitespace in phrases", () => {
    expect(normalizeLetterMixupTarget("  ice   cream ")).toBe("ice cream");
  });

  it("keeps fixed spaces in answer slots and omits them from the tray", () => {
    const layout = buildLetterMixupLayout("ice cream", {
      shuffleLetters: false,
      shuffleSeed: "seed",
    });
    expect(layout.targetChars.join("")).toBe("ice cream");
    expect(layout.trayLetters.join("")).toBe("icecream");
    expect(layout.trayGroups).toEqual([["i", "c", "e"], ["c", "r", "e", "a", "m"]]);
    expect(layout.trayLetters.includes(" ")).toBe(false);
  });

  it("scrambles letters only within each word", () => {
    const layout = buildLetterMixupLayout("ice cream", {
      shuffleLetters: true,
      shuffleSeed: "stable-seed",
    });
    expect(layout.trayGroups).toHaveLength(2);
    expect(layout.trayGroups[0]!.slice().sort().join("")).toBe("cei");
    expect(layout.trayGroups[1]!.slice().sort().join("")).toBe("acemr");
    // Letters from "cream" must not appear inside the first word group.
    for (const ch of layout.trayGroups[0]!) {
      expect("ice".includes(ch)).toBe(true);
    }
    for (const ch of layout.trayGroups[1]!) {
      expect("cream".includes(ch)).toBe(true);
    }
  });

  it("pre-fills locked space slots", () => {
    const slots = buildInitialLetterMixupSlots("ice cream".split(""));
    expect(slots).toHaveLength(9);
    expect(slots[3]).toEqual({
      traySlotKey: "space__3",
      char: " ",
      locked: true,
    });
    expect(slots[0]).toBeNull();
    expect(slots[4]).toBeNull();
  });
});
