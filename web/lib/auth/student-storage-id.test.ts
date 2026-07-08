import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";
import {
  clearStudentStorageIdCache,
  ensureGuestDeviceId,
  readLegacyAnonymousDeviceId,
  resolveStudentStorageIdSync,
  setStudentStorageIdCache,
} from "@/lib/auth/student-storage-id";
import {
  migrateLocalStorageToStudentStorageId,
  resetStudentStorageMigrationMemo,
} from "@/lib/auth/student-storage-migrate";
import { MASTERY_STORAGE_KEY, readMasterySnapshot } from "@/lib/mastery/local-storage";
import { REWARDS_STORAGE_KEY } from "@/lib/progress/rewards";
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
  return store;
}

describe("scoped-local-storage", () => {
  it("builds scoped keys", () => {
    expect(scopedLocalStorageKey("wke-progress-v1", "user-abc")).toBe(
      "wke-progress-v1:user-abc",
    );
  });
});

describe("student-storage-id", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    installLocalStorage();
  });

  afterEach(() => {
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    vi.unstubAllGlobals();
  });

  it("reads legacy anonymous device id from unscoped progress", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: "device-legacy",
        completedLessonIds: [],
      }),
    );
    expect(readLegacyAnonymousDeviceId()).toBe("device-legacy");
  });

  it("prefers cached auth user id over device id", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: "device-legacy",
        completedLessonIds: [],
      }),
    );
    setStudentStorageIdCache("auth-user-1");
    expect(resolveStudentStorageIdSync()).toBe("auth-user-1");
  });

  it("falls back to guest device id when not authenticated", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: "device-legacy",
        completedLessonIds: [],
      }),
    );
    expect(resolveStudentStorageIdSync()).toBe("device-legacy");
  });

  it("creates a guest device id when legacy progress is missing", () => {
    const id = ensureGuestDeviceId();
    expect(id).toBeTruthy();
    expect(readLegacyAnonymousDeviceId()).toBe(id);
  });
});

describe("student-storage-migrate", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    installLocalStorage();
  });

  afterEach(() => {
    clearStudentStorageIdCache();
    resetStudentStorageMigrationMemo();
    vi.unstubAllGlobals();
  });

  it("copies legacy unscoped keys into the authenticated namespace once", () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: "device-legacy",
        completedLessonIds: [],
      }),
    );
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify({ gold: 5 }));
    localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify({ records: {} }));

    migrateLocalStorageToStudentStorageId("auth-user-1");
    migrateLocalStorageToStudentStorageId("auth-user-1");

    expect(
      localStorage.getItem(scopedLocalStorageKey(PROGRESS_STORAGE_KEY, "auth-user-1")),
    ).toContain("device-legacy");
    expect(localStorage.getItem(scopedLocalStorageKey(REWARDS_STORAGE_KEY, "auth-user-1"))).toBe(
      JSON.stringify({ gold: 5 }),
    );
    expect(
      localStorage.getItem(scopedLocalStorageKey(MASTERY_STORAGE_KEY, "auth-user-1")),
    ).toBe(JSON.stringify({ records: {} }));
  });

  it("does not copy guest data when only the auth cache is set (sign-up path)", () => {
    const guestId = "device-guest-signup";
    localStorage.setItem(
      scopedLocalStorageKey(REWARDS_STORAGE_KEY, guestId),
      JSON.stringify({ gold: 42 }),
    );
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: guestId,
        completedLessonIds: ["lesson-1"],
      }),
    );

    setStudentStorageIdCache("auth-user-new");
    expect(readMasterySnapshot().records).toEqual({});
    expect(
      localStorage.getItem(scopedLocalStorageKey(REWARDS_STORAGE_KEY, "auth-user-new")),
    ).toBeNull();
    expect(
      localStorage.getItem(scopedLocalStorageKey(PROGRESS_STORAGE_KEY, "auth-user-new")),
    ).toBeNull();
  });

  it("does not overwrite existing scoped data", () => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ anonymousDeviceId: "d1" }));
    localStorage.setItem(
      scopedLocalStorageKey(PROGRESS_STORAGE_KEY, "auth-user-1"),
      JSON.stringify({ scoped: true }),
    );

    migrateLocalStorageToStudentStorageId("auth-user-1");

    expect(
      JSON.parse(
        localStorage.getItem(scopedLocalStorageKey(PROGRESS_STORAGE_KEY, "auth-user-1"))!,
      ),
    ).toEqual({ scoped: true });
  });

  it("isolates scoped data between two authenticated student ids", () => {
    localStorage.setItem(
      scopedLocalStorageKey(REWARDS_STORAGE_KEY, "student-a"),
      JSON.stringify({ gold: 10 }),
    );
    localStorage.setItem(
      scopedLocalStorageKey(REWARDS_STORAGE_KEY, "student-b"),
      JSON.stringify({ gold: 99 }),
    );

    setStudentStorageIdCache("student-a");
    expect(
      JSON.parse(
        localStorage.getItem(scopedLocalStorageKey(REWARDS_STORAGE_KEY, "student-a"))!,
      ).gold,
    ).toBe(10);

    setStudentStorageIdCache("student-b");
    expect(
      JSON.parse(
        localStorage.getItem(scopedLocalStorageKey(REWARDS_STORAGE_KEY, "student-b"))!,
      ).gold,
    ).toBe(99);
  });
});
