import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyMasteryRecord } from "@/lib/mastery/engine";
import {
  clearAllSyncQueue,
  enqueueSyncItem,
  MAX_SYNC_QUEUE_ITEMS,
  readSyncQueue,
  readSyncQueueForStudent,
  removeSyncItem,
  clearSyncQueueForStudent,
} from "@/lib/mastery/sync-queue";

const studentId = "a1111111-1111-4111-8111-111111111111";

function installSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
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
  vi.stubGlobal("sessionStorage", sessionStorage);
  vi.stubGlobal("window", Object.assign(globalThis, { sessionStorage }));
}

function evidencePushItem(id: string) {
  const target = { type: "word" as const, key: "word-a", label: "a" };
  const record = createEmptyMasteryRecord({ studentId, target });
  return {
    kind: "evidence_push" as const,
    schemaVersion: 1 as const,
    studentId,
    enqueuedAt: new Date().toISOString(),
    evidence: {
      id,
      studentId,
      sessionId: "session-1",
      occurredAt: "2026-07-09T08:00:00.000Z",
      source: "vocab_set" as const,
      activityId: "secondary:match",
      targetRefs: [target],
      response: {
        kind: "match" as const,
        success: true,
        firstTry: true,
        attempts: 1,
      },
    },
    masteryRecords: [record],
  };
}

afterEach(() => {
  clearAllSyncQueue();
  vi.unstubAllGlobals();
});

describe("mastery sync queue", () => {
  beforeEach(() => {
    installSessionStorage();
  });

  it("enqueues and reads items for a student", () => {
    enqueueSyncItem(evidencePushItem("event-1"));
    expect(readSyncQueueForStudent(studentId)).toHaveLength(1);
  });

  it("dedupes by evidence id per student", () => {
    enqueueSyncItem(evidencePushItem("event-1"));
    enqueueSyncItem(evidencePushItem("event-1"));
    expect(readSyncQueue()).toHaveLength(1);
  });

  it("drops oldest items when over cap", () => {
    for (let i = 0; i < MAX_SYNC_QUEUE_ITEMS + 5; i += 1) {
      enqueueSyncItem(evidencePushItem(`event-${i}`));
    }
    expect(readSyncQueue()).toHaveLength(MAX_SYNC_QUEUE_ITEMS);
    expect(readSyncQueue()[0]?.kind).toBe("evidence_push");
    if (readSyncQueue()[0]?.kind === "evidence_push") {
      expect(readSyncQueue()[0].evidence.id).toBe("event-5");
    }
  });

  it("removes one item and clears per student", () => {
    enqueueSyncItem(evidencePushItem("event-1"));
    enqueueSyncItem(evidencePushItem("event-2"));
    removeSyncItem("event-1", studentId);
    expect(readSyncQueueForStudent(studentId)).toHaveLength(1);
    clearSyncQueueForStudent(studentId);
    expect(readSyncQueueForStudent(studentId)).toHaveLength(0);
  });
});
