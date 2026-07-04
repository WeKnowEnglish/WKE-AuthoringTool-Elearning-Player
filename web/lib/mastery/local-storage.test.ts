import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MASTERY_EVIDENCE_STORAGE_KEY,
  MASTERY_STORAGE_KEY,
  readLearningEvidenceEvents,
  readMasterySnapshot,
  recordLearningEvidenceEvent,
} from "@/lib/mastery/local-storage";
import type { LearningEvidenceEvent } from "@/lib/mastery/types";

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

function evidence(): LearningEvidenceEvent {
  return {
    id: "event-1",
    studentId: "student-1",
    sessionId: "session-1",
    occurredAt: "2026-07-04T08:00:00.000Z",
    source: "vocab_set",
    activityId: "vocab-food",
    itemId: "screen-1",
    targetRefs: [{ type: "word", key: "apple", label: "apple" }],
    response: {
      kind: "type",
      success: true,
      firstTry: true,
      attempts: 1,
    },
    context: {
      scaffoldingLevel: "medium",
      evidenceMode: "recall",
      activityMode: "practice",
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mastery local storage", () => {
  it("returns an empty snapshot without browser storage", () => {
    expect(readMasterySnapshot().records).toEqual({});
  });

  it("stores evidence and updates mastery records", () => {
    const localStorage = installLocalStorage();
    const snapshot = recordLearningEvidenceEvent(evidence());

    expect(snapshot.records["word:apple"]).toBeTruthy();
    expect(readLearningEvidenceEvents()).toHaveLength(1);
    expect(localStorage.getItem(MASTERY_STORAGE_KEY)).toContain("word:apple");
    expect(localStorage.getItem(MASTERY_EVIDENCE_STORAGE_KEY)).toContain("event-1");
  });
});

