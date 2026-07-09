import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockAfterCompletion } = vi.hoisted(() => ({
  mockAfterCompletion: vi.fn(),
}));

vi.mock("@/lib/secondary/secondary-activity-completion", () => ({
  afterSecondaryActivityCompletion: mockAfterCompletion,
}));

import { PROGRESS_STORAGE_KEY } from "@/lib/progress/types";
import { setSecondaryTodayActivityCompletion } from "@/lib/secondary/secondary-today-session";

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

describe("secondary-today-session activity completion", () => {
  const now = new Date("2026-07-08T10:00:00.000Z");

  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        anonymousDeviceId: "guest-completion",
        completedLessonIds: [],
      }),
    );
    mockAfterCompletion.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs afterSecondaryActivityCompletion when an activity is marked complete", () => {
    setSecondaryTodayActivityCompletion(
      "match",
      { completed: true, percent: 90, completedAt: now.toISOString() },
      now,
    );

    expect(mockAfterCompletion).toHaveBeenCalledTimes(1);
  });
});
