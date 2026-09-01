import { describe, expect, it } from "vitest";
import {
  emptySession1RunState,
  normalizeSession1HotspotProgress,
  normalizeSession1PracticeProgress,
  normalizeSession1RunState,
} from "./session-run";

describe("Session 1 run contract", () => {
  it("creates a safe initial snapshot", () => {
    expect(emptySession1RunState()).toEqual({
      hotspot: {
        activeStepId: "welcome",
        badgeComplete: false,
        badgePreview: null,
        stationChoice: null,
        stationOpinions: {},
        introducedStationIds: [],
        pictureCheckItemIds: [],
        pictureCheckCorrectIds: [],
        questionCorrect: false,
        reflection: null,
        nextStepGoal: null,
        completedVoiceParts: [],
      },
      practice: {
        activeActivityId: null,
        completedActivityIds: [],
        writingDraft: "",
      },
    });
  });

  it("normalizes hotspot state without trusting arbitrary input", () => {
    expect(normalizeSession1HotspotProgress({
      activeStepId: "choose",
      badgeComplete: true,
      badgePreview: "data:image/webp;base64,abc",
      stationChoice: "art",
      stationOpinions: { art: "like", music: "dont_like", bad: "maybe" },
      introducedStationIds: ["art", "art", "music", 3],
      pictureCheckItemIds: ["check-art", "check-books", "check-music", "check-pets"],
      pictureCheckCorrectIds: ["check-art", "check-books"],
      questionCorrect: true,
      reflection: "I felt ready",
      nextStepGoal: "Say a longer reason",
      completedVoiceParts: ["station-choice", "station-choice", 4],
    })).toEqual({
      activeStepId: "choose",
      badgeComplete: true,
      badgePreview: "data:image/webp;base64,abc",
      stationChoice: "art",
      stationOpinions: { art: "like", music: "dont_like" },
      introducedStationIds: ["art", "music"],
      pictureCheckItemIds: ["check-art", "check-books", "check-music"],
      pictureCheckCorrectIds: ["check-art", "check-books"],
      questionCorrect: true,
      reflection: "I felt ready",
      nextStepGoal: "Say a longer reason",
      completedVoiceParts: ["station-choice"],
    });
  });

  it("filters practice activity ids and limits writing size", () => {
    const normalized = normalizeSession1PracticeProgress({
      activeActivityId: "grammar-focus",
      completedActivityIds: ["vocabulary", "bad-id", "vocabulary"],
      writingDraft: "x".repeat(12000),
    });
    expect(normalized.activeActivityId).toBe("grammar-focus");
    expect(normalized.completedActivityIds).toEqual(["vocabulary"]);
    expect(normalized.writingDraft).toHaveLength(10000);
  });

  it("repairs malformed nested state", () => {
    expect(normalizeSession1RunState({ hotspot: null, practice: [] })).toEqual(
      emptySession1RunState(),
    );
  });
});
