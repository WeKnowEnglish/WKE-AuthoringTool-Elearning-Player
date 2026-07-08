import { describe, expect, it } from "vitest";
import {
  applyLocalAttemptTransition,
  createInitialLocalActivityWordState,
  detectWasRepaired,
  getRequiredSuccessfulAttempts,
  getWordsNeedingRepair,
  isActivityLocallyComplete,
  isLocalWordResolved,
} from "@/lib/secondary/local-activity-transitions";

describe("local activity transitions", () => {
  it("requires 1 success for strong words and 2 otherwise", () => {
    expect(getRequiredSuccessfulAttempts({ masteryScore01: 0.8 })).toBe(1);
    expect(getRequiredSuccessfulAttempts({ legacyMasteryLevel: 4 })).toBe(1);
    expect(getRequiredSuccessfulAttempts({ masteryScore01: 0.1 })).toBe(2);
    expect(getRequiredSuccessfulAttempts({ legacyMasteryLevel: 2 })).toBe(2);
  });

  it("marks passed on first correct when required=1", () => {
    const initial = createInitialLocalActivityWordState({
      studentId: "s1",
      activitySessionId: "2026-07-08:spelling",
      wordItemId: "w1",
      masteryScore01: 0.82,
    });
    expect(initial.requiredSuccessfulAttempts).toBe(1);
    const next = applyLocalAttemptTransition(initial, true);
    expect(next.status).toBe("passed");
    expect(isLocalWordResolved(next)).toBe(true);
  });

  it("needs two successes for weak words and supports repair", () => {
    const initial = createInitialLocalActivityWordState({
      studentId: "s1",
      activitySessionId: "2026-07-08:match",
      wordItemId: "w1",
      masteryScore01: 0.1,
    });
    const missed = applyLocalAttemptTransition(initial, false);
    expect(missed.status).toBe("needs_repair");
    expect(detectWasRepaired(missed, true)).toBe(true);

    const repaired = applyLocalAttemptTransition(missed, true);
    expect(repaired.status).toBe("repaired");
    expect(repaired.successfulAttempts).toBe(1);
    expect(isLocalWordResolved(repaired)).toBe(false);

    const passed = applyLocalAttemptTransition(repaired, true);
    expect(passed.status).toBe("passed");
    expect(isLocalWordResolved(passed)).toBe(true);
  });

  it("treats unresolved words as needing more practice", () => {
    const initial = createInitialLocalActivityWordState({
      studentId: "s1",
      activitySessionId: "2026-07-08:match",
      wordItemId: "w1",
      masteryScore01: 0.1,
    });
    const once = applyLocalAttemptTransition(initial, true);
    expect(once.status).toBe("correct");
    expect(getWordsNeedingRepair({ w1: once }, ["w1"])).toEqual(["w1"]);
    expect(isActivityLocallyComplete(["w1"], { w1: once })).toBe(false);
  });
});
