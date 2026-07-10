import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStudentStorageIdCache } from "@/lib/auth/student-storage-id";
import {
  buildSecondaryActivitySessionId,
  getLocalActivityStorageKey,
  readLocalActivityMap,
} from "@/lib/secondary/local-activity-store";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/types";
import {
  isStaleUnknownWordSession,
  pruneLocalActivityStoresForSession,
} from "@/lib/secondary/secondary-session-lifecycle";
import { SESSION_STORAGE_KEY_PREFIX } from "@/lib/secondary/secondary-student-id";
import type { SecondaryTodaySession } from "@/lib/secondary/types";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
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

describe("secondary-session-lifecycle", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    clearStudentStorageIdCache();
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  });

  afterEach(() => {
    clearStudentStorageIdCache();
    vi.unstubAllGlobals();
  });

  it("detects unknown word ids in slow-replace audit fields", () => {
    const session: SecondaryTodaySession = {
      dateKey: "2026-07-08",
      warmUpWordItemIds: [],
      todayWordItemIds: ["g7-a2-school-life-subject"],
      allWordItemIds: ["g7-a2-school-life-subject"],
      introducedWordItemIds: ["legacy-mvp-only-word"],
    };

    expect(isStaleUnknownWordSession(session)).toBe(true);
  });

  it("detects unknown word ids in a cached session", () => {
    const session: SecondaryTodaySession = {
      dateKey: "2026-07-08",
      warmUpWordItemIds: [],
      todayWordItemIds: ["g7-a2-school-life-subject", "not-in-bank"],
      allWordItemIds: ["g7-a2-school-life-subject", "not-in-bank"],
    };

    expect(isStaleUnknownWordSession(session)).toBe(true);
  });

  it("prunes local activity state for evicted words", () => {
    const studentId = "guest-prune";
    const dateKey = "2026-07-08";
    seedHubDeviceId(studentId);

    const matchSessionId = buildSecondaryActivitySessionId(dateKey, "match");
    localStorage.setItem(
      getLocalActivityStorageKey(studentId, matchSessionId),
      JSON.stringify({
        "g7-a2-school-life-subject": {
          studentId,
          activitySessionId: matchSessionId,
          wordItemId: "g7-a2-school-life-subject",
          status: "resolved",
          successfulAttempts: 1,
          requiredSuccessfulAttempts: 1,
        },
        "ghost-word": {
          studentId,
          activitySessionId: matchSessionId,
          wordItemId: "ghost-word",
          status: "pending",
          successfulAttempts: 0,
          requiredSuccessfulAttempts: 1,
        },
      }),
    );

    const session: SecondaryTodaySession = {
      dateKey,
      warmUpWordItemIds: [],
      todayWordItemIds: ["g7-a2-school-life-subject"],
      allWordItemIds: ["g7-a2-school-life-subject"],
    };

    expect(pruneLocalActivityStoresForSession(session)).toBe(true);
    const map = readLocalActivityMap(studentId, matchSessionId);
    expect(Object.keys(map)).toEqual(["g7-a2-school-life-subject"]);
  });
});

describe("secondary-session-lifecycle stale integration", () => {
  it("uses a stable session storage prefix", () => {
    expect(SESSION_STORAGE_KEY_PREFIX).toContain("secondary-vocab-today-session");
  });
});
