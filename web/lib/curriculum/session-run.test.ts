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
        stationChoice: null,
        questionCorrect: false,
        reflection: null,
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
      stationChoice: "art",
      questionCorrect: true,
      reflection: "I felt ready",
      completedVoiceParts: ["station-choice", "station-choice", 4],
    })).toEqual({
      activeStepId: "choose",
      badgeComplete: true,
      stationChoice: "art",
      questionCorrect: true,
      reflection: "I felt ready",
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
