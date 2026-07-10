import { describe, expect, it } from "vitest";
import {
  applyLocalAttemptTransition,
  applyLocalRevealTransition,
  applyLocalSentenceSubmitTransition,
  createInitialLocalActivityWordState,
  detectWasRepaired,
  getRequiredSuccessfulAttempts,
  getWordsNeedingRepair,
  isActivityLocallyComplete,
  isLocalWordResolved,
} from "@/lib/secondary/local-activity-transitions";

describe("local activity transitions", () => {
  it("requires one successful attempt per word for activity completion", () => {
    expect(getRequiredSuccessfulAttempts({ masteryScore01: 0.8 })).toBe(1);
    expect(getRequiredSuccessfulAttempts({ legacyMasteryLevel: 4 })).toBe(1);
    expect(getRequiredSuccessfulAttempts({ masteryScore01: 0.1 })).toBe(1);
    expect(getRequiredSuccessfulAttempts({ legacyMasteryLevel: 2 })).toBe(1);
  });

  it("marks passed on first correct for strong words", () => {
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

  it("passes weak words on first correct and supports repair after a miss", () => {
    const initial = createInitialLocalActivityWordState({
      studentId: "s1",
      activitySessionId: "2026-07-08:match",
      wordItemId: "w1",
      masteryScore01: 0.1,
    });
    const passed = applyLocalAttemptTransition(initial, true);
    expect(passed.status).toBe("passed");
    expect(isLocalWordResolved(passed)).toBe(true);

    const missed = applyLocalAttemptTransition(initial, false);
    expect(missed.status).toBe("needs_repair");
    expect(detectWasRepaired(missed, true)).toBe(true);

    const repaired = applyLocalAttemptTransition(missed, true);
    expect(repaired.status).toBe("passed");
    expect(repaired.successfulAttempts).toBe(1);
    expect(isLocalWordResolved(repaired)).toBe(true);
  });

  it("treats a single correct attempt as resolved for activity completion", () => {
    const initial = createInitialLocalActivityWordState({
      studentId: "s1",
      activitySessionId: "2026-07-08:match",
      wordItemId: "w1",
      masteryScore01: 0.1,
    });
    const once = applyLocalAttemptTransition(initial, true);
    expect(once.status).toBe("passed");
    expect(getWordsNeedingRepair({ w1: once }, ["w1"])).toEqual([]);
    expect(isActivityLocallyComplete(["w1"], { w1: once })).toBe(true);
  });

  it("resolves legacy session rows that still store requiredSuccessfulAttempts=2", () => {
    const initial = createInitialLocalActivityWordState({
      studentId: "s1",
      activitySessionId: "2026-07-08:match",
      wordItemId: "w1",
      masteryScore01: 0.1,
    });
    const legacyCorrect = {
      ...applyLocalAttemptTransition(initial, true),
      status: "correct" as const,
      requiredSuccessfulAttempts: 2 as const,
    };
    expect(isLocalWordResolved(legacyCorrect)).toBe(true);
    expect(getWordsNeedingRepair({ w1: legacyCorrect }, ["w1"])).toEqual([]);
  });

  it("treats revealed words as session-resolved", () => {
    const initial = createInitialLocalActivityWordState({
      studentId: "s1",
      activitySessionId: "2026-07-08:match",
      wordItemId: "w1",
      masteryScore01: 0.1,
    });
    const missed = applyLocalAttemptTransition(initial, false);
    const revealed = applyLocalRevealTransition(missed);
    expect(revealed.status).toBe("revealed");
    expect(isLocalWordResolved(revealed)).toBe(true);
    expect(isActivityLocallyComplete(["w1"], { w1: revealed })).toBe(true);
  });

  it("treats pending_review as session-resolved for sentence submit", () => {
    const initial = createInitialLocalActivityWordState({
      studentId: "s1",
      activitySessionId: "2026-07-08:sentence",
      wordItemId: "w1",
      masteryScore01: 0.2,
    });
    const submitted = applyLocalSentenceSubmitTransition(initial);
    expect(submitted.status).toBe("pending_review");
    expect(isLocalWordResolved(submitted)).toBe(true);
    expect(isActivityLocallyComplete(["w1"], { w1: submitted })).toBe(true);
  });
});
