import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import { clearStudentStorageIdCache, setStudentStorageIdCache } from "@/lib/auth/student-storage-id";
import { createEmptyMasteryRecord } from "@/lib/mastery/engine";
import {
  MASTERY_STORAGE_KEY,
  readMasterySnapshot,
  writeMasterySnapshot,
  type MasterySnapshot,
} from "@/lib/mastery/local-storage";
import {
  affectedTargetKeys,
  ensureMasteryHydratedForCurrentStudent,
  flushMasterySyncQueueForCurrentStudent,
  hydrateLocalMasteryFromServer,
  mergeMasterySnapshots,
  pullMasterySnapshotFromServer,
  pushEvidenceAndMasteryToServer,
  pushLocalMasteryBacklog,
  resetMasteryHydrationMemo,
  resetMasterySyncStateForTests,
} from "@/lib/mastery/supabase-sync";
import { flushScheduledMasteryUpserts } from "@/lib/mastery/mastery-upsert-debounce";
import {
  readSyncQueueForStudent,
  clearAllSyncQueue,
} from "@/lib/mastery/sync-queue";
import type { LearningEvidenceEvent, StudentMasteryRecord } from "@/lib/mastery/types";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: mockCreateClient,
}));

const studentId = "a1111111-1111-4111-8111-111111111111";
const targetA = { type: "word" as const, key: "word-a", label: "a" };
const targetB = { type: "word" as const, key: "word-b", label: "b" };

function recordWithScore(
  target: { type: "word"; key: string; label: string },
  masteryScore: number,
  updatedAt: string,
): StudentMasteryRecord {
  const record = createEmptyMasteryRecord({ studentId, target });
  record.masteryScore = masteryScore;
  record.updatedAt = updatedAt;
  return record;
}

function snapshot(
  records: Record<string, StudentMasteryRecord>,
  updatedAt = "",
): MasterySnapshot {
  return { schemaVersion: 1, updatedAt, records };
}

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
  vi.stubGlobal("window", Object.assign(globalThis, { sessionStorage, localStorage: globalThis.localStorage }));
}

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

function mockSupabase(rows: unknown[], userId = studentId) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    }),
  };
}

function sampleEvidence(overrides: Partial<LearningEvidenceEvent> = {}): LearningEvidenceEvent {
  return {
    id: "session-1:word-a:1720500000000:success",
    studentId,
    sessionId: "session-1",
    occurredAt: "2026-07-09T08:00:00.000Z",
    source: "vocab_set",
    activityId: "secondary:match",
    targetRefs: [targetA],
    response: {
      kind: "match",
      success: true,
      firstTry: true,
      attempts: 1,
    },
    ...overrides,
  };
}

function mockPushSupabase(input?: {
  userId?: string;
  evidenceError?: { code: string; message: string } | null;
  masteryError?: { code: string; message: string } | null;
}) {
  const evidenceInsert = vi
    .fn()
    .mockResolvedValue({ error: input?.evidenceError ?? null });
  const masteryUpsert = vi.fn().mockResolvedValue({ error: input?.masteryError ?? null });
  const from = vi.fn((table: string) => {
    if (table === "student_learning_evidence") {
      return { insert: evidenceInsert };
    }
    if (table === "student_mastery_records") {
      return { upsert: masteryUpsert };
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: input?.userId ?? studentId } },
        error: null,
      }),
    },
    from,
    evidenceInsert,
    masteryUpsert,
  };
}

afterEach(() => {
  clearStudentStorageIdCache();
  resetMasterySyncStateForTests();
  mockCreateClient.mockReset();
  vi.unstubAllGlobals();
});

describe("mergeMasterySnapshots", () => {
  it("returns server records when local is empty", () => {
    const serverRecord = recordWithScore(targetA, 0.8, "2026-07-09T10:00:00.000Z");
    const server = snapshot({ "word:word-a": serverRecord }, "2026-07-09T10:00:00.000Z");

    const merged = mergeMasterySnapshots(snapshot({}), server);

    expect(merged.records["word:word-a"]?.masteryScore).toBe(0.8);
    expect(merged.updatedAt).toBe("2026-07-09T10:00:00.000Z");
  });

  it("keeps local when server is empty", () => {
    const localRecord = recordWithScore(targetA, 0.5, "2026-07-09T09:00:00.000Z");
    const local = snapshot({ "word:word-a": localRecord }, "2026-07-09T09:00:00.000Z");

    const merged = mergeMasterySnapshots(local, snapshot({}));

    expect(merged.records["word:word-a"]?.masteryScore).toBe(0.5);
  });

  it("unions disjoint keys", () => {
    const localRecord = recordWithScore(targetA, 0.4, "2026-07-09T09:00:00.000Z");
    const serverRecord = recordWithScore(targetB, 0.7, "2026-07-09T10:00:00.000Z");
    const local = snapshot({ "word:word-a": localRecord });
    const server = snapshot({ "word:word-b": serverRecord });

    const merged = mergeMasterySnapshots(local, server);

    expect(merged.records["word:word-a"]?.masteryScore).toBe(0.4);
    expect(merged.records["word:word-b"]?.masteryScore).toBe(0.7);
    expect(merged.updatedAt).toBe("2026-07-09T10:00:00.000Z");
  });

  it("prefers server when server updatedAt is newer", () => {
    const localRecord = recordWithScore(targetA, 0.3, "2026-07-09T09:00:00.000Z");
    const serverRecord = recordWithScore(targetA, 0.9, "2026-07-09T10:00:00.000Z");
    const merged = mergeMasterySnapshots(
      snapshot({ "word:word-a": localRecord }),
      snapshot({ "word:word-a": serverRecord }),
    );

    expect(merged.records["word:word-a"]?.masteryScore).toBe(0.9);
  });

  it("prefers local when local updatedAt is newer", () => {
    const localRecord = recordWithScore(targetA, 0.95, "2026-07-09T11:00:00.000Z");
    const serverRecord = recordWithScore(targetA, 0.2, "2026-07-09T10:00:00.000Z");
    const merged = mergeMasterySnapshots(
      snapshot({ "word:word-a": localRecord }),
      snapshot({ "word:word-a": serverRecord }),
    );

    expect(merged.records["word:word-a"]?.masteryScore).toBe(0.95);
  });

  it("prefers server on updatedAt tie", () => {
    const tiedAt = "2026-07-09T10:00:00.000Z";
    const localRecord = recordWithScore(targetA, 0.3, tiedAt);
    const serverRecord = recordWithScore(targetA, 0.9, tiedAt);
    const merged = mergeMasterySnapshots(
      snapshot({ "word:word-a": localRecord }),
      snapshot({ "word:word-a": serverRecord }),
    );

    expect(merged.records["word:word-a"]?.masteryScore).toBe(0.9);
  });
});

describe("pull and hydrate", () => {
  beforeEach(() => {
    installLocalStorage();
    setStudentStorageIdCache(studentId);
  });

  it("maps server rows into a mastery snapshot", async () => {
    const record = recordWithScore(targetA, 0.6, "2026-07-09T08:00:00.000Z");
    const supabase = mockSupabase([
      {
        id: "row-1",
        student_id: studentId,
        target_key: "word:word-a",
        target_type: "word",
        record,
        updated_at: record.updatedAt,
        created_at: "2026-07-09T08:00:00.000Z",
      },
    ]);

    const pulled = await pullMasterySnapshotFromServer(supabase as never, studentId);

    expect(pulled?.records["word:word-a"]?.masteryScore).toBe(0.6);
  });

  it("hydrates merged mastery into scoped local storage", async () => {
    const serverRecord = recordWithScore(targetB, 0.75, "2026-07-09T10:00:00.000Z");
    const supabase = mockSupabase([
      {
        id: "row-1",
        student_id: studentId,
        target_key: "word:word-b",
        target_type: "word",
        record: serverRecord,
        updated_at: serverRecord.updatedAt,
        created_at: "2026-07-09T10:00:00.000Z",
      },
    ]);

    await hydrateLocalMasteryFromServer(supabase as never, studentId);

    const stored = readMasterySnapshot();
    expect(stored.records["word:word-b"]?.masteryScore).toBe(0.75);
    expect(
      localStorage.getItem(scopedLocalStorageKey(MASTERY_STORAGE_KEY, studentId)),
    ).toContain("word:word-b");
  });
});

describe("ensureMasteryHydratedForCurrentStudent", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it("no-ops for guests", async () => {
    await ensureMasteryHydratedForCurrentStudent();
    expect(readMasterySnapshot().records).toEqual({});
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("dedupes concurrent hydrate calls for the same student", async () => {
    setStudentStorageIdCache(studentId);
    const record = recordWithScore(targetA, 0.55, "2026-07-09T08:00:00.000Z");
    const supabase = mockSupabase([
      {
        id: "row-1",
        student_id: studentId,
        target_key: "word:word-a",
        target_type: "word",
        record,
        updated_at: record.updatedAt,
        created_at: "2026-07-09T08:00:00.000Z",
      },
    ]);
    mockCreateClient.mockReturnValue(supabase);

    await Promise.all([
      ensureMasteryHydratedForCurrentStudent(),
      ensureMasteryHydratedForCurrentStudent(),
    ]);

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(readMasterySnapshot().records["word:word-a"]?.masteryScore).toBe(0.55);
  });

  it("re-hydrates when the authenticated student changes", async () => {
    const studentB = "b2222222-2222-4222-8222-222222222222";
    const recordA = recordWithScore(targetA, 0.4, "2026-07-09T08:00:00.000Z");
    const recordB = recordWithScore(targetB, 0.8, "2026-07-09T09:00:00.000Z");

    const supabaseA = mockSupabase([
      {
        id: "row-a",
        student_id: studentId,
        target_key: "word:word-a",
        target_type: "word",
        record: recordA,
        updated_at: recordA.updatedAt,
        created_at: recordA.updatedAt,
      },
    ]);
    const supabaseB = mockSupabase(
      [
        {
          id: "row-b",
          student_id: studentB,
          target_key: "word:word-b",
          target_type: "word",
          record: recordB,
          updated_at: recordB.updatedAt,
          created_at: recordB.updatedAt,
        },
      ],
      studentB,
    );

    setStudentStorageIdCache(studentId);
    mockCreateClient.mockReturnValue(supabaseA);
    await ensureMasteryHydratedForCurrentStudent();
    expect(readMasterySnapshot().records["word:word-a"]?.masteryScore).toBe(0.4);

    setStudentStorageIdCache(studentB);
    mockCreateClient.mockReturnValue(supabaseB);
    await ensureMasteryHydratedForCurrentStudent();
    expect(readMasterySnapshot().records["word:word-b"]?.masteryScore).toBe(0.8);
    expect(supabaseB.from).toHaveBeenCalledTimes(1);
  });
});

describe("write-through push", () => {
  beforeEach(() => {
    installLocalStorage();
    installSessionStorage();
    setStudentStorageIdCache(studentId);
    clearAllSyncQueue();
  });

  async function flushMastery(student = studentId) {
    await flushScheduledMasteryUpserts(student);
  }

  it("collects affected target keys from evidence refs", () => {
    const evidence = sampleEvidence({
      targetRefs: [targetA],
      skillRefs: [{ type: "strand", key: "vocabulary" }],
    });

    expect(affectedTargetKeys(evidence)).toEqual(
      expect.arrayContaining(["word:word-a", "strand:vocabulary"]),
    );
  });

  it("inserts evidence and upserts affected mastery rows", async () => {
    const evidence = sampleEvidence();
    const record = recordWithScore(targetA, 0.66, "2026-07-09T08:00:00.000Z");
    const supabase = mockPushSupabase();
    mockCreateClient.mockReturnValue(supabase);

    await pushEvidenceAndMasteryToServer(evidence, snapshot({ "word:word-a": record }));
    await flushMastery();

    expect(supabase.evidenceInsert).toHaveBeenCalledTimes(1);
    expect(supabase.masteryUpsert).toHaveBeenCalledTimes(1);
    expect(supabase.masteryUpsert.mock.calls[0]?.[0]).toMatchObject({
      student_id: studentId,
      target_key: "word:word-a",
    });
  });

  it("treats duplicate evidence inserts as non-fatal and still upserts mastery", async () => {
    const evidence = sampleEvidence();
    const record = recordWithScore(targetA, 0.5, "2026-07-09T08:00:00.000Z");
    const supabase = mockPushSupabase({
      evidenceError: { code: "23505", message: "duplicate key value" },
    });
    mockCreateClient.mockReturnValue(supabase);

    await pushEvidenceAndMasteryToServer(evidence, snapshot({ "word:word-a": record }));
    await flushMastery();

    expect(supabase.masteryUpsert).toHaveBeenCalledTimes(1);
  });

  it("enqueues failed evidence pushes for retry", async () => {
    const evidence = sampleEvidence();
    const record = recordWithScore(targetA, 0.5, "2026-07-09T08:00:00.000Z");
    const supabase = mockPushSupabase({
      evidenceError: { code: "500", message: "network error" },
    });
    mockCreateClient.mockReturnValue(supabase);

    await pushEvidenceAndMasteryToServer(evidence, snapshot({ "word:word-a": record }));

    expect(readSyncQueueForStudent(studentId)).toHaveLength(1);
    expect(readSyncQueueForStudent(studentId)[0]?.kind).toBe("evidence_push");
  });

  it("replays queued evidence on flush", async () => {
    const evidence = sampleEvidence();
    const record = recordWithScore(targetA, 0.5, "2026-07-09T08:00:00.000Z");
    const failing = mockPushSupabase({
      evidenceError: { code: "500", message: "network error" },
    });
    mockCreateClient.mockReturnValue(failing);

    await pushEvidenceAndMasteryToServer(evidence, snapshot({ "word:word-a": record }));
    expect(readSyncQueueForStudent(studentId)).toHaveLength(1);

    const recovering = mockPushSupabase();
    mockCreateClient.mockReturnValue(recovering);
    await flushMasterySyncQueueForCurrentStudent();

    expect(recovering.evidenceInsert).toHaveBeenCalledTimes(1);
    expect(readSyncQueueForStudent(studentId)).toHaveLength(0);
  });

  it("aborts when evidence studentId does not match auth user", async () => {
    const evidence = sampleEvidence({ studentId: "other-student" });
    const supabase = mockPushSupabase();
    mockCreateClient.mockReturnValue(supabase);

    await pushEvidenceAndMasteryToServer(
      evidence,
      snapshot({ "word:word-a": recordWithScore(targetA, 0.5, "2026-07-09T08:00:00.000Z") }),
    );

    expect(supabase.evidenceInsert).not.toHaveBeenCalled();
    expect(supabase.masteryUpsert).not.toHaveBeenCalled();
  });

  it("upserts all local mastery records in backlog push", async () => {
    const recordA = recordWithScore(targetA, 0.4, "2026-07-09T08:00:00.000Z");
    const recordB = recordWithScore(targetB, 0.8, "2026-07-09T09:00:00.000Z");
    writeMasterySnapshot(snapshot({ "word:word-a": recordA, "word:word-b": recordB }));

    const supabase = mockPushSupabase();
    await pushLocalMasteryBacklog(supabase as never, studentId);

    expect(supabase.masteryUpsert).toHaveBeenCalledTimes(2);
  });
});
