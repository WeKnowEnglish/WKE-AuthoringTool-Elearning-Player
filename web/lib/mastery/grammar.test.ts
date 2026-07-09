import { afterEach, describe, expect, it, vi } from "vitest";
import { learningTargetKey } from "@/lib/mastery/engine";
import {
  createGrammarEvidenceEvent,
  createGrammarLearningTarget,
  grammarPosterActivityId,
  recordGrammarEvidence,
} from "@/lib/mastery/grammar";

function installLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("grammar mastery evidence", () => {
  it("creates grammar learning targets from GKE micro-skill ids", () => {
    expect(
      createGrammarLearningTarget({
        microSkillId: "grammar.existential.there_is_are.short_answers.positive_negative_singular",
        label: "Short answers singular",
      }),
    ).toEqual({
      type: "grammar",
      key: "grammar.existential.there_is_are.short_answers.positive_negative_singular",
      label: "Short answers singular",
    });
  });

  it("creates grammar evidence with lesson source and recognition mode", () => {
    const event = createGrammarEvidenceEvent({
      studentId: "student-1",
      sessionId: "session-1",
      activityId: grammarPosterActivityId("short-answers-there-is-a1"),
      itemId: "sa-tf-1",
      microSkillId: "grammar.existential.there_is_are.short_answers.positive_negative_singular",
      success: true,
      firstTry: true,
      attempts: 1,
      occurredAt: new Date("2026-07-09T08:00:00.000Z"),
    });

    expect(event.source).toBe("lesson");
    expect(event.activityId).toBe("grammar:short-answers-there-is-a1");
    expect(event.response.kind).toBe("tap");
    expect(event.context?.evidenceMode).toBe("recognition");
    expect(event.targetRefs[0]?.type).toBe("grammar");
    expect(event.targetRefs).toContainEqual({
      type: "strand",
      key: "language_focused_learning",
      label: "Language-Focused Learning",
    });
  });

  it("attaches errorCode on misses when provided", () => {
    const event = createGrammarEvidenceEvent({
      studentId: "student-1",
      sessionId: "session-1",
      activityId: grammarPosterActivityId("short-answers-there-is-a1"),
      itemId: "sa-tf-2",
      microSkillId: "grammar.existential.there_is_are.short_answers.positive_negative_plural",
      success: false,
      firstTry: false,
      attempts: 1,
      errorCode: "error.agreement.there_are_singular",
    });

    expect(event.response.success).toBe(false);
    expect(event.response.errorCode).toBe("error.agreement.there_are_singular");
  });

  it("records grammar evidence into mastery storage", () => {
    installLocalStorage();
    const microSkillId =
      "grammar.existential.there_is_are.short_answers.positive_negative_singular";
    const snapshot = recordGrammarEvidence({
      studentId: "student-1",
      sessionId: "session-1",
      activityId: grammarPosterActivityId("short-answers-there-is-a1"),
      itemId: "sa-tf-1",
      microSkillId,
      success: true,
      firstTry: true,
      attempts: 1,
      occurredAt: new Date("2026-07-09T08:00:00.000Z"),
    });

    const key = learningTargetKey({ type: "grammar", key: microSkillId });
    expect(snapshot?.records[key]).toBeTruthy();
    expect(snapshot?.records[key]?.targetType).toBe("grammar");
    expect(snapshot?.records[key]?.retrievalSuccessCount).toBeGreaterThanOrEqual(1);
  });

  it("records failure counts for incorrect grammar attempts", () => {
    installLocalStorage();
    const microSkillId =
      "grammar.existential.there_is_are.short_answers.positive_negative_plural";
    const snapshot = recordGrammarEvidence({
      studentId: "student-1",
      sessionId: "session-1",
      activityId: grammarPosterActivityId("short-answers-there-is-a1"),
      itemId: "sa-tf-2",
      microSkillId,
      success: false,
      firstTry: true,
      attempts: 1,
      errorCode: "error.agreement.there_are_singular",
      occurredAt: new Date("2026-07-09T08:01:00.000Z"),
    });

    const key = learningTargetKey({ type: "grammar", key: microSkillId });
    expect(snapshot?.records[key]?.retrievalFailureCount).toBeGreaterThanOrEqual(1);
  });
});
