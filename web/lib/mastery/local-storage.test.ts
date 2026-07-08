import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import { clearStudentStorageIdCache } from "@/lib/auth/student-storage-id";
import { resetStudentStorageMigrationMemo } from "@/lib/auth/student-storage-migrate";
import {
  MASTERY_EVIDENCE_STORAGE_KEY,
  MASTERY_STORAGE_KEY,
  readLearningEvidenceEvents,
  readMasterySnapshot,
  recordLearningEvidenceEvent,
} from "@/lib/mastery/local-storage";
import type { LearningEvidenceEvent } from "@/lib/mastery/types";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/types";

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
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
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
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
  clearStudentStorageIdCache();
  resetStudentStorageMigrationMemo();
  vi.unstubAllGlobals();
});

describe("mastery local storage", () => {
  beforeEach(() => {
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
  });

  it("returns an empty snapshot without browser storage", () => {
    expect(readMasterySnapshot().records).toEqual({});
  });

  it("stores evidence and updates mastery records", () => {
    const localStorage = installLocalStorage();
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: "student-1",
        completedLessonIds: [],
      }),
    );
    const snapshot = recordLearningEvidenceEvent(evidence());

    expect(snapshot.records["word:apple"]).toBeTruthy();
    expect(readLearningEvidenceEvents()).toHaveLength(1);
    expect(localStorage.getItem(scopedLocalStorageKey(MASTERY_STORAGE_KEY, "student-1"))).toContain(
      "word:apple",
    );
    expect(
      localStorage.getItem(scopedLocalStorageKey(MASTERY_EVIDENCE_STORAGE_KEY, "student-1")),
    ).toContain("event-1");
  });
});

