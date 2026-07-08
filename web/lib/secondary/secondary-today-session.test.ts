import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOrCreateSecondaryTodaySession,
  getSecondaryTodayDateKey,
  TARGET_WORDS,
  WARMUP_WORDS,
} from "@/lib/secondary/secondary-today-session";

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

function stubBrowserStorage() {
  const localStorage = createMemoryStorage();
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  return localStorage;
}

describe("secondary-today-session", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubBrowserStorage();
  });

  it("formats a stable local date key", () => {
    expect(getSecondaryTodayDateKey(new Date(2026, 6, 8, 15, 30))).toBe("2026-07-08");
    expect(getSecondaryTodayDateKey(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });

  it("creates a non-empty session from the MVP bank and reuses it", () => {
    const now = new Date(2026, 6, 8, 10, 0);
    const first = getOrCreateSecondaryTodaySession(now);
    const second = getOrCreateSecondaryTodaySession(now);

    expect(first.dateKey).toBe("2026-07-08");
    expect(first.allWordItemIds.length).toBeGreaterThan(0);
    expect(first.allWordItemIds.length).toBeLessThanOrEqual(TARGET_WORDS + WARMUP_WORDS + 8);
    expect(second).toEqual(first);
  });

  it("keeps an intentionally empty stored session for the day", () => {
    const now = new Date(2026, 6, 8, 10, 0);
    const studentId = "anon-test";
    localStorage.setItem("secondary-vocab-student-id-v1", studentId);
    localStorage.setItem(
      `secondary-vocab-today-session-v2:${studentId}:2026-07-08`,
      JSON.stringify({
        dateKey: "2026-07-08",
        warmUpWordItemIds: [],
        todayWordItemIds: [],
        allWordItemIds: [],
      }),
    );

    const session = getOrCreateSecondaryTodaySession(now);
    expect(session.allWordItemIds).toEqual([]);
    expect(session.dateKey).toBe("2026-07-08");
  });

  it("rebuilds when stored session payload is corrupted", () => {
    const now = new Date(2026, 6, 8, 10, 0);
    const studentId = "anon-test-2";
    localStorage.setItem("secondary-vocab-student-id-v1", studentId);
    localStorage.setItem(
      `secondary-vocab-today-session-v2:${studentId}:2026-07-08`,
      JSON.stringify({ dateKey: "2026-07-08", broken: true }),
    );

    const session = getOrCreateSecondaryTodaySession(now);
    expect(session.dateKey).toBe("2026-07-08");
    expect(Array.isArray(session.allWordItemIds)).toBe(true);
    expect(session.allWordItemIds.length).toBeGreaterThan(0);
  });
});
