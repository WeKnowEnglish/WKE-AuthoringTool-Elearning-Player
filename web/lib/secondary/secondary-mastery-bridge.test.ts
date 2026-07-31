import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import { clearStudentStorageIdCache, setStudentStorageIdCache } from "@/lib/auth/student-storage-id";
import { resetStudentStorageMigrationMemo } from "@/lib/auth/student-storage-migrate";
import { MASTERY_STORAGE_KEY, readMasterySnapshot } from "@/lib/mastery/local-storage";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/types";
import {
  applySecondaryAttemptToPlatformMastery,
  projectMasteryScoreToLegacyLevel,
  secondaryActivityToEvidenceShape,
} from "@/lib/secondary/secondary-mastery-bridge";
import {
  recordSecondaryLearnWordAttempt,
  recordSecondaryWordAttempt,
  resolveSecondaryStudentId,
} from "@/lib/secondary/secondary-word-progress";
import { getWordProgressStorageKey } from "@/lib/secondary/secondary-student-id";

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

describe("secondary-mastery-bridge", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    stubBrowserStorage();
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: "device-1",
        completedLessonIds: [],
      }),
    );
  });

  afterEach(() => {
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    vi.unstubAllGlobals();
  });

  it("maps secondary activities to evidence shapes", () => {
    expect(secondaryActivityToEvidenceShape("match")).toEqual({
      activityId: "secondary:match",
      responseKind: "match",
      evidenceMode: "recognition",
    });
    expect(secondaryActivityToEvidenceShape("cloze")).toEqual({
      activityId: "secondary:cloze",
      responseKind: "type",
      evidenceMode: "recall",
    });
    expect(secondaryActivityToEvidenceShape("spelling")).toEqual({
      activityId: "secondary:spelling",
      responseKind: "type",
      evidenceMode: "recall",
    });
    expect(secondaryActivityToEvidenceShape("learn")).toEqual({
      activityId: "secondary:learn",
      responseKind: "match",
      evidenceMode: "recognition",
    });
  });

  it("projects 0–1 mastery onto legacy 0–5 bands", () => {
    expect(projectMasteryScoreToLegacyLevel(0)).toBe(0);
    expect(projectMasteryScoreToLegacyLevel(0.19)).toBe(0);
    expect(projectMasteryScoreToLegacyLevel(0.2)).toBe(1);
    expect(projectMasteryScoreToLegacyLevel(0.59)).toBe(2);
    expect(projectMasteryScoreToLegacyLevel(0.74)).toBe(3);
    expect(projectMasteryScoreToLegacyLevel(0.89)).toBe(4);
    expect(projectMasteryScoreToLegacyLevel(0.9)).toBe(5);
  });

  it("writes platform mastery evidence then projects a legacy progress row", () => {
    const projected = applySecondaryAttemptToPlatformMastery({
      studentId: "device-1",
      attempt: {
        activityType: "match",
        wordItemId: "g7-a2-apple",
        isCorrect: true,
        attemptedAt: "2026-07-08T10:00:00.000Z",
      },
    });

    expect(projected.wordItemId).toBe("g7-a2-apple");
    expect(projected.timesSeen).toBeGreaterThanOrEqual(1);
    expect(projected.timesCorrect).toBeGreaterThanOrEqual(1);
    expect(projected.correctStreak).toBe(0);
    expect(projected.masteryLevel).toBeGreaterThanOrEqual(0);

    const snapshot = readMasterySnapshot();
    expect(snapshot.records["word:g7-a2-apple"]).toBeTruthy();
    expect(snapshot.records["word:g7-a2-apple"].masteryScore).toBeGreaterThan(0);
  });
});

describe("recordSecondaryWordAttempt (M5 platform SoT)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    stubBrowserStorage();
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: "hub-device-abc",
        completedLessonIds: [],
      }),
    );
  });

  afterEach(() => {
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    vi.unstubAllGlobals();
  });

  it("uses guest device id when not authenticated", () => {
    expect(resolveSecondaryStudentId()).toBe("hub-device-abc");
  });

  it("uses cached auth user id when signed in", () => {
    setStudentStorageIdCache("supabase-user-xyz");
    expect(resolveSecondaryStudentId()).toBe("supabase-user-xyz");
  });

  it("writes platform mastery only — no legacy dual-write (M5)", () => {
    const progress = recordSecondaryWordAttempt({
      activityType: "spelling",
      wordItemId: "g7-a2-brave",
      isCorrect: true,
      attemptedAt: "2026-07-08T12:00:00.000Z",
    });

    expect(progress.timesSeen).toBeGreaterThanOrEqual(1);
    expect(localStorage.getItem(getWordProgressStorageKey("hub-device-abc"))).toBeNull();

    const snapshot = readMasterySnapshot();
    expect(snapshot.records["word:g7-a2-brave"]).toBeTruthy();
    expect(
      localStorage.getItem(scopedLocalStorageKey(MASTERY_STORAGE_KEY, "hub-device-abc")),
    ).toContain("word:g7-a2-brave");
  });

  it("records learn-drawer evidence with lexicon dual-write when mapped", () => {
    const progress = recordSecondaryLearnWordAttempt(
      {
        wordItemId: "g7-a2-school-life-subject",
        isCorrect: true,
        attemptedAt: "2026-07-08T12:30:00.000Z",
      },
      { firstTry: true, attempts: 1 },
    );

    expect(progress.timesSeen).toBeGreaterThanOrEqual(1);
    const snapshot = readMasterySnapshot();
    expect(snapshot.records["word:g7-a2-school-life-subject"]).toBeTruthy();
    expect(snapshot.records["word:pv_subject_noun"]).toBeTruthy();
    expect(snapshot.records["word:pv_subject_noun"]!.masteryScore).toBe(
      snapshot.records["word:g7-a2-school-life-subject"]!.masteryScore,
    );
  });

  it("rejects learn activity on recordSecondaryWordAttempt", () => {
    expect(() =>
      recordSecondaryWordAttempt({
        activityType: "learn",
        wordItemId: "g7-a2-school-life-subject",
        isCorrect: true,
        attemptedAt: "2026-07-08T12:30:00.000Z",
      }),
    ).toThrow(/recordSecondaryLearnWordAttempt/);
  });
});
