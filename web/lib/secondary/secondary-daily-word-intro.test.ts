import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/student-storage-id", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/student-storage-id")>();
  return {
    ...actual,
    ensureGuestDeviceId: vi.fn(() => "guest-device-1"),
  };
});

import {
  clearStudentStorageIdCache,
  ensureGuestDeviceId,
  setStudentStorageIdCache,
} from "@/lib/auth/student-storage-id";
import {
  clearDailyWordIntroSeen,
  DAILY_WORD_INTRO_SEEN_PREFIX,
  hasSeenDailyWordIntro,
  markDailyWordIntroSeen,
} from "@/lib/secondary/secondary-daily-word-intro";

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

describe("secondary-daily-word-intro", () => {
  const studentId = "student-a";
  const dateKey = "2026-07-10";

  beforeEach(() => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  });

  afterEach(() => {
    clearStudentStorageIdCache();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns false when key is missing", () => {
    expect(hasSeenDailyWordIntro(studentId, dateKey)).toBe(false);
  });

  it("marks seen and reads back", () => {
    markDailyWordIntroSeen(studentId, dateKey);
    expect(hasSeenDailyWordIntro(studentId, dateKey)).toBe(true);
    expect(localStorage.getItem(`${DAILY_WORD_INTRO_SEEN_PREFIX}${studentId}:${dateKey}`)).toBe("1");
  });

  it("isolates students and dates", () => {
    markDailyWordIntroSeen(studentId, dateKey);
    expect(hasSeenDailyWordIntro("student-b", dateKey)).toBe(false);
    expect(hasSeenDailyWordIntro(studentId, "2026-07-11")).toBe(false);
  });

  it("clears seen flag", () => {
    markDailyWordIntroSeen(studentId, dateKey);
    clearDailyWordIntroSeen(studentId, dateKey);
    expect(hasSeenDailyWordIntro(studentId, dateKey)).toBe(false);
  });

  it("treats guest dismiss as seen for authenticated student id on same device", () => {
    setStudentStorageIdCache(studentId);
    markDailyWordIntroSeen("guest-device-1", dateKey);
    expect(hasSeenDailyWordIntro(studentId, dateKey)).toBe(true);
  });

  it("marks seen for both authenticated and guest ids", () => {
    setStudentStorageIdCache(studentId);
    markDailyWordIntroSeen(studentId, dateKey);
    expect(localStorage.getItem(`${DAILY_WORD_INTRO_SEEN_PREFIX}${studentId}:${dateKey}`)).toBe("1");
    expect(localStorage.getItem(`${DAILY_WORD_INTRO_SEEN_PREFIX}guest-device-1:${dateKey}`)).toBe(
      "1",
    );
  });
});
