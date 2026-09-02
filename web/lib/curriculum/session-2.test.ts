import { describe, expect, it } from "vitest";

import {
  SESSION_2_ACTIVITY_MATRIX,
  SESSION_2_CHECKS,
  SESSION_2_FRIENDS,
  SESSION_2_QUESTION,
} from "@/lib/curriculum/session-2";

describe("Grade 4 Movers Session 2", () => {
  it("moves from asking to listening and introducing", () => {
    const playable = SESSION_2_ACTIVITY_MATRIX.filter((item) => item.iteration === "playable_v1");
    expect(playable.map((item) => item.id)).toEqual([
      "badge-return",
      "profile-search",
      "question-builder",
      "ask-friend",
      "listen-fill",
      "find-match",
      "introduce-friend",
      "random-check",
      "learning-choice",
    ]);
  });

  it("uses one controlled question across all friend profiles", () => {
    expect(SESSION_2_QUESTION.chunks.join(" ")).toBe(SESSION_2_QUESTION.model);
    expect(SESSION_2_FRIENDS).toHaveLength(3);
    expect(new Set(SESSION_2_FRIENDS.map((friend) => friend.interest)).size).toBe(3);
    expect(SESSION_2_CHECKS).toHaveLength(3);
  });
});
