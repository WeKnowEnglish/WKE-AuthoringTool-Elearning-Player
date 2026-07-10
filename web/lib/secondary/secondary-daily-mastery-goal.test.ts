import { describe, expect, it } from "vitest";
import { countSecondaryDailyMasteryGoalProgress } from "@/lib/secondary/secondary-daily-mastery-goal";
import type { SecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";

function snapshot(
  wordItemId: string,
  masteryScore01: number,
): SecondaryWordDisplaySnapshot {
  return {
    wordItemId,
    masteryScore01,
    state: masteryScore01 >= 0.75 ? "mastered" : "learning",
    legacyLevel: masteryScore01 >= 0.75 ? 4 : 2,
    timesSeen: 3,
    timesCorrect: 2,
    recentAccuracy: 0.8,
  };
}

describe("secondary-daily-mastery-goal", () => {
  it("counts mastered focus words plus words rotated off the list", () => {
    const progress = countSecondaryDailyMasteryGoalProgress({
      todayWordItemIds: ["a", "b", "c"],
      replacedOutWordItemIds: ["x", "y"],
      snapshotForWord: (wordItemId) => snapshot(wordItemId, wordItemId === "a" ? 0.8 : 0.2),
      goal: 10,
    });

    expect(progress.masteredCount).toBe(3);
    expect(progress.remainingCount).toBe(7);
    expect(progress.goalReached).toBe(false);
  });

  it("caps progress at the daily goal", () => {
    const progress = countSecondaryDailyMasteryGoalProgress({
      todayWordItemIds: ["a", "b", "c", "d", "e"],
      replacedOutWordItemIds: ["r1", "r2", "r3", "r4", "r5", "r6"],
      snapshotForWord: (wordItemId) => snapshot(wordItemId, 0.9),
      goal: 10,
    });

    expect(progress.masteredCount).toBe(10);
    expect(progress.goalReached).toBe(true);
    expect(progress.remainingCount).toBe(0);
  });

  it("returns zero when nothing is mastered yet", () => {
    const progress = countSecondaryDailyMasteryGoalProgress({
      todayWordItemIds: ["a", "b"],
      replacedOutWordItemIds: [],
      snapshotForWord: (wordItemId) => snapshot(wordItemId, 0.1),
      goal: 10,
    });

    expect(progress.masteredCount).toBe(0);
    expect(progress.remainingCount).toBe(10);
  });
});
