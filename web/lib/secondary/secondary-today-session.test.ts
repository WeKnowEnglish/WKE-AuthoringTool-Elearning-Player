import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import {
  clearStudentStorageIdCache,
  setStudentStorageIdCache,
} from "@/lib/auth/student-storage-id";
import {
  migrateLocalStorageToStudentStorageId,
  resetStudentStorageMigrationMemo,
} from "@/lib/auth/student-storage-migrate";
import { learningTargetKey } from "@/lib/mastery/engine";
import { MASTERY_STORAGE_KEY } from "@/lib/mastery/local-storage";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import {
  getOrCreateSecondaryTodaySession,
  getSecondaryTodayDateKey,
  TARGET_TODAY_WORDS,
  WARMUP_WORDS,
} from "@/lib/secondary/secondary-today-session";
import { getAllSecondaryWordItemIds } from "@/lib/secondary/secondary-vocab-bank";
import { SESSION_STORAGE_KEY_PREFIX } from "@/lib/secondary/secondary-student-id";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/types";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
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
}

function stubBrowserStorage() {
  const localStorage = createMemoryStorage();
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  return localStorage;
}

function masteryRecord(
  wordId: string,
  studentId: string,
  overrides: Partial<StudentMasteryRecord> = {},
): StudentMasteryRecord {
  const targetKey = learningTargetKey({ type: "word", key: wordId });
  return {
    studentId,
    targetKey,
    targetType: "word",
    targetLabel: wordId,
    state: "developing",
    masteryScore: 0.3,
    confidence: 0.5,
    exposureCount: 3,
    retrievalSuccessCount: 1,
    retrievalFailureCount: 2,
    firstTrySuccessCount: 1,
    lastSeenAt: "2026-07-01T08:00:00.000Z",
    lastSuccessAt: "2026-07-01T08:00:00.000Z",
    nextReviewAt: "2026-07-10T08:00:00.000Z",
    commonErrorCodes: [],
    scaffoldingNeeded: "medium",
    updatedAt: "2026-07-01T08:00:00.000Z",
    ...overrides,
  };
}

function seedScopedMastery(
  studentId: string,
  records: Record<string, StudentMasteryRecord>,
) {
  localStorage.setItem(
    scopedLocalStorageKey(MASTERY_STORAGE_KEY, studentId),
    JSON.stringify({
      schemaVersion: 1,
      updatedAt: "2026-07-04T08:00:00.000Z",
      records,
    }),
  );
}

describe("secondary-today-session", () => {
  const now = new Date(2026, 6, 8, 10, 0);
  const dateKey = "2026-07-08";

  beforeEach(() => {
    vi.unstubAllGlobals();
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    stubBrowserStorage();
  });

  afterEach(() => {
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    vi.unstubAllGlobals();
  });

  function seedHubDeviceId(studentId: string) {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: studentId,
        completedLessonIds: [],
      }),
    );
  }

  it("formats a stable local date key", () => {
    expect(getSecondaryTodayDateKey(new Date(2026, 6, 8, 15, 30))).toBe("2026-07-08");
    expect(getSecondaryTodayDateKey(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });

  it("creates a non-empty v2 session from the MVP bank and reuses it", () => {
    const first = getOrCreateSecondaryTodaySession(now);
    const second = getOrCreateSecondaryTodaySession(now);

    expect(first.dateKey).toBe(dateKey);
    expect(first.selectionVersion).toBe(3);
    expect(first.allWordItemIds.length).toBeGreaterThan(0);
    expect(first.allWordItemIds.length).toBeLessThanOrEqual(
      WARMUP_WORDS + TARGET_TODAY_WORDS + 8,
    );
    expect(second).toEqual(first);
  });

  it("rebuilds stale empty stored session when the vocab bank has words", () => {
    const studentId = "anon-test";
    seedHubDeviceId(studentId);
    localStorage.setItem(
      `${SESSION_STORAGE_KEY_PREFIX}${studentId}:${dateKey}`,
      JSON.stringify({
        dateKey,
        warmUpWordItemIds: [],
        todayWordItemIds: [],
        allWordItemIds: [],
      }),
    );

    const session = getOrCreateSecondaryTodaySession(now);
    expect(session.allWordItemIds.length).toBeGreaterThan(0);
    expect(session.dateKey).toBe(dateKey);
    expect(session.selectionVersion).toBe(3);
  });

  it("rebuilds when stored session payload is corrupted", () => {
    const studentId = "anon-test-2";
    seedHubDeviceId(studentId);
    localStorage.setItem(
      `${SESSION_STORAGE_KEY_PREFIX}${studentId}:${dateKey}`,
      JSON.stringify({ dateKey, broken: true }),
    );

    const session = getOrCreateSecondaryTodaySession(now);
    expect(session.dateKey).toBe(dateKey);
    expect(Array.isArray(session.allWordItemIds)).toBe(true);
    expect(session.allWordItemIds.length).toBeGreaterThan(0);
    expect(session.selectionVersion).toBe(3);
  });

  it("includes due words when scoped mastery marks them due", () => {
    const studentId = "guest-due";
    const bankIds = getAllSecondaryWordItemIds();
    const dueWordId = bankIds[0]!;
    const dueKey = learningTargetKey({ type: "word", key: dueWordId });

    seedHubDeviceId(studentId);
    seedScopedMastery(studentId, {
      [dueKey]: masteryRecord(dueWordId, studentId, {
        nextReviewAt: "2026-07-07T08:00:00.000Z",
        masteryScore: 0.25,
        state: "needs_review",
      }),
    });

    const session = getOrCreateSecondaryTodaySession(now);
    expect(session.allWordItemIds).toContain(dueWordId);
  });

  it("excludes mastered due words from normal picks", () => {
    const studentId = "guest-mastered";
    const bankIds = getAllSecondaryWordItemIds();
    const masteredId = bankIds[0]!;
    const activeId = bankIds[1]!;
    const masteredKey = learningTargetKey({ type: "word", key: masteredId });
    const activeKey = learningTargetKey({ type: "word", key: activeId });

    seedHubDeviceId(studentId);
    seedScopedMastery(studentId, {
      [masteredKey]: masteryRecord(masteredId, studentId, {
        masteryScore: 0.9,
        state: "secure",
        nextReviewAt: "2026-07-07T08:00:00.000Z",
      }),
      [activeKey]: masteryRecord(activeId, studentId, {
        masteryScore: 0.3,
        state: "developing",
        nextReviewAt: "2026-07-07T08:00:00.000Z",
      }),
    });

    const session = getOrCreateSecondaryTodaySession(now);
    expect(session.allWordItemIds).toContain(activeId);
    expect(session.allWordItemIds).not.toContain(masteredId);
  });

  it("isolates daily sessions per account on the same browser", () => {
    const bankIds = getAllSecondaryWordItemIds();
    const wordForA = bankIds[2]!;
    const wordForB = bankIds[4]!;

    seedHubDeviceId("device-shared");
    setStudentStorageIdCache("user-a");
    seedScopedMastery("user-a", {
      [learningTargetKey({ type: "word", key: wordForA })]: masteryRecord(wordForA, "user-a", {
        nextReviewAt: "2026-07-07T08:00:00.000Z",
        state: "stuck",
        masteryScore: 0.2,
      }),
    });

    const sessionA = getOrCreateSecondaryTodaySession(now);
    expect(sessionA.allWordItemIds).toContain(wordForA);

    clearStudentStorageIdCache();
    setStudentStorageIdCache("user-b");
    seedScopedMastery("user-b", {
      [learningTargetKey({ type: "word", key: wordForB })]: masteryRecord(wordForB, "user-b", {
        nextReviewAt: "2026-07-07T08:00:00.000Z",
        state: "stuck",
        masteryScore: 0.2,
      }),
    });

    const sessionB = getOrCreateSecondaryTodaySession(now);
    expect(sessionB.allWordItemIds).toContain(wordForB);
    expect(sessionB.allWordItemIds).not.toEqual(sessionA.allWordItemIds);
    expect(
      localStorage.getItem(`${SESSION_STORAGE_KEY_PREFIX}user-a:${dateKey}`),
    ).toBeTruthy();
    expect(
      localStorage.getItem(`${SESSION_STORAGE_KEY_PREFIX}user-b:${dateKey}`),
    ).toBeTruthy();
  });

  it("does not inherit guest mastery for a new account without explicit migrate", () => {
    const guestId = "device-guest-migrate";
    const authId = "auth-user-new";
    const bankIds = getAllSecondaryWordItemIds();
    const fragileWordId = bankIds[3]!;
    const fragileKey = learningTargetKey({ type: "word", key: fragileWordId });

    seedHubDeviceId(guestId);
    seedScopedMastery(guestId, {
      [fragileKey]: masteryRecord(fragileWordId, guestId, {
        state: "stuck",
        masteryScore: 0.15,
        nextReviewAt: "2026-07-10T08:00:00.000Z",
      }),
    });

    setStudentStorageIdCache(authId);
    getOrCreateSecondaryTodaySession(now);

    expect(
      localStorage.getItem(scopedLocalStorageKey(MASTERY_STORAGE_KEY, authId)),
    ).toBeNull();
  });

  it("uses guest mastery after explicit sign-in migrate", () => {
    const guestId = "device-guest-migrate";
    const authId = "auth-user-migrate";
    const bankIds = getAllSecondaryWordItemIds();
    const fragileWordId = bankIds[3]!;
    const fragileKey = learningTargetKey({ type: "word", key: fragileWordId });

    seedHubDeviceId(guestId);
    seedScopedMastery(guestId, {
      [fragileKey]: masteryRecord(fragileWordId, guestId, {
        state: "stuck",
        masteryScore: 0.15,
        nextReviewAt: "2026-07-10T08:00:00.000Z",
      }),
    });

    setStudentStorageIdCache(authId);
    migrateLocalStorageToStudentStorageId(authId);
    const session = getOrCreateSecondaryTodaySession(now);
    expect(session.allWordItemIds).toContain(fragileWordId);
    expect(session.selectionVersion).toBe(3);
  });

  it("slow-replaces mastered today words when threshold is met on session load", () => {
    const studentId = "guest-slow-replace";
    seedHubDeviceId(studentId);

    const bankIds = getAllSecondaryWordItemIds();
    expect(bankIds.length).toBeGreaterThanOrEqual(4);
    const todayIds = bankIds.slice(0, 4);

    const masteredIds = todayIds.slice(0, 3);
    const records: Record<string, StudentMasteryRecord> = {};
    for (const wordId of bankIds) {
      const key = learningTargetKey({ type: "word", key: wordId });
      records[key] = masteredIds.includes(wordId)
        ? masteryRecord(wordId, studentId, { masteryScore: 0.92, state: "secure" })
        : masteryRecord(wordId, studentId, { masteryScore: 0.3, state: "developing" });
    }
    seedScopedMastery(studentId, records);

    localStorage.setItem(
      `${SESSION_STORAGE_KEY_PREFIX}${studentId}:${dateKey}`,
      JSON.stringify({
        dateKey,
        warmUpWordItemIds: [],
        todayWordItemIds: todayIds,
        allWordItemIds: todayIds,
        selectionVersion: 2,
        masteredOnListOrder: masteredIds,
      }),
    );

    const reloaded = getOrCreateSecondaryTodaySession(now);
    expect(reloaded.selectionVersion).toBe(3);
    expect(reloaded.replacedOutWordItemIds).toContain(masteredIds[0]);
    expect(reloaded.todayWordItemIds).not.toContain(masteredIds[0]);
    expect(reloaded.todayWordItemIds.length).toBe(todayIds.length);
    expect(reloaded.todayWordItemIds.some((id) => !todayIds.includes(id))).toBe(true);
  });
});
