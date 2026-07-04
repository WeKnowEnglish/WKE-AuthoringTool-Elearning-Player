import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createVocabularyEvidenceEvent,
  createVocabularyLearningTarget,
  recordVocabularyEvidence,
} from "@/lib/mastery/vocabulary";

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

describe("vocabulary mastery evidence", () => {
  it("creates word learning targets from vocabulary ids", () => {
    expect(createVocabularyLearningTarget({ wordId: "food-apple", lemma: "apple" })).toEqual({
      type: "word",
      key: "food-apple",
      label: "apple",
    });
  });

  it("creates vocabulary evidence with practice context", () => {
    const event = createVocabularyEvidenceEvent({
      studentId: "student-1",
      sessionId: "session-1",
      activityId: "vocab-food",
      itemId: "screen-1",
      wordId: "food-apple",
      lemma: "apple",
      success: true,
      firstTry: true,
      attempts: 1,
      responseKind: "type",
      evidenceMode: "production",
      occurredAt: new Date("2026-07-04T08:00:00.000Z"),
    });

    expect(event.source).toBe("vocab_set");
    expect(event.targetRefs[0]).toEqual({
      type: "word",
      key: "food-apple",
      label: "apple",
    });
    expect(event.targetRefs).toContainEqual({
      type: "strand",
      key: "language_focused_learning",
      label: "Language-Focused Learning",
    });
    expect(event.context?.strandIds).toEqual(["language_focused_learning"]);
    expect(event.context?.activityMode).toBe("practice");
  });

  it("records vocabulary evidence into mastery storage", () => {
    installLocalStorage();
    const snapshot = recordVocabularyEvidence({
      studentId: "student-1",
      sessionId: "session-1",
      activityId: "vocab-food",
      itemId: "screen-1",
      wordId: "food-apple",
      lemma: "apple",
      success: true,
      firstTry: true,
      attempts: 1,
      responseKind: "type",
      evidenceMode: "production",
      occurredAt: new Date("2026-07-04T08:00:00.000Z"),
    });

    expect(snapshot?.records["word:food-apple"]).toBeTruthy();
  });
});
