import { describe, expect, it } from "vitest";
import { normalizeLiveGameClassProjectProgress } from "./class-project-progress";

describe("normalizeLiveGameClassProjectProgress", () => {
  it("preserves valid project evidence", () => {
    expect(normalizeLiveGameClassProjectProgress({
      roundsPlayed: 4,
      teamEscapes: 3,
      lastPlayedAt: "2026-07-14T09:00:00.000Z",
      lastLearningObjective: "Use past-tense verbs in context",
    })).toEqual({
      roundsPlayed: 4,
      teamEscapes: 3,
      lastPlayedAt: "2026-07-14T09:00:00.000Z",
      lastLearningObjective: "Use past-tense verbs in context",
    });
  });

  it("uses safe defaults for malformed stored progress", () => {
    expect(normalizeLiveGameClassProjectProgress({
      roundsPlayed: -2,
      teamEscapes: "many",
      lastPlayedAt: "",
    })).toEqual({
      roundsPlayed: 0,
      teamEscapes: 0,
      lastPlayedAt: null,
      lastLearningObjective: null,
    });
  });
});
