import { describe, expect, it } from "vitest";
import {
  getSecondaryWordLearnStatus,
  getSecondaryWordLearnStatusDisplay,
} from "@/lib/secondary/secondary-learn-display";
import type { SecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";

function makeSnapshot(
  overrides: Partial<SecondaryWordDisplaySnapshot> = {},
): SecondaryWordDisplaySnapshot {
  return {
    wordItemId: "test",
    masteryScore01: 0,
    state: "new",
    legacyLevel: 0,
    timesSeen: 0,
    timesCorrect: 0,
    recentAccuracy: 0,
    ...overrides,
  };
}

describe("secondary-learn-display", () => {
  it("maps mastery snapshots to learn status labels", () => {
    expect(getSecondaryWordLearnStatus(makeSnapshot())).toBe("new");
    expect(getSecondaryWordLearnStatus(makeSnapshot({ timesSeen: 2, legacyLevel: 2 }), { isFocus: true })).toBe(
      "weak",
    );
    expect(getSecondaryWordLearnStatus(makeSnapshot({ legacyLevel: 2, timesSeen: 3, masteryScore01: 0.5 }))).toBe(
      "practicing",
    );
    expect(
      getSecondaryWordLearnStatus(
        makeSnapshot({ legacyLevel: 3, timesSeen: 5, masteryScore01: 0.6 }),
      ),
    ).toBe("strong");
    expect(getSecondaryWordLearnStatus(makeSnapshot({ masteryScore01: 0.8, legacyLevel: 4 }))).toBe(
      "mastered",
    );
  });

  it("builds dot progress from mastery score", () => {
    const display = getSecondaryWordLearnStatusDisplay(
      makeSnapshot({ masteryScore01: 0.5, legacyLevel: 2, timesSeen: 2 }),
    );
    expect(display.label).toBe("Practicing");
    expect(display.filledDots).toBe(2);
    expect(display.totalDots).toBe(4);
  });
});
