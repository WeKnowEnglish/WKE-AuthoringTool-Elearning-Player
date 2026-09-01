import { describe, expect, it } from "vitest";

import { emptySession3RunProgress, normalizeSession3RunProgress } from "./session-3-run";

describe("Session 3 run state", () => {
  it("starts at the mission with no assumed learner choices", () => {
    expect(emptySession3RunProgress()).toMatchObject({ activeStageId: "mission", favouriteActivityId: null, visitedFriendIds: [] });
  });

  it("drops unknown IDs and limits bounded progress", () => {
    const state = normalizeSession3RunProgress({
      foundBadgeIds: ["painting", "unknown", "painting", "football"],
      favouriteActivityId: "unknown",
      visitedFriendIds: ["mia", "ghost", "mia", "leo"],
      checkIndex: 99,
      completedPracticeActivityIds: ["vocabulary", "fake", "vocabulary"],
    });
    expect(state.foundBadgeIds).toEqual(["painting", "football"]);
    expect(state.favouriteActivityId).toBeNull();
    expect(state.visitedFriendIds).toEqual(["mia", "leo"]);
    expect(state.checkIndex).toBe(3);
    expect(state.completedPracticeActivityIds).toEqual(["vocabulary"]);
  });
});
