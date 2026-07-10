import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSecondaryActivityAttemptSnapshot,
  getSecondaryActivityAttemptSnapshot,
  hasSecondaryActivityAttempt,
  hasSecondaryActivityAttemptSnapshot,
  saveSecondaryActivityAttemptSnapshot,
  type SecondaryActivityAttemptSnapshot,
} from "@/lib/secondary/secondary-activity-attempt-snapshot";

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

describe("secondary-activity-attempt-snapshot", () => {
  const studentId = "student-a";
  const dateKey = "2026-07-10";

  const snapshot: SecondaryActivityAttemptSnapshot = {
    version: 1,
    activityKey: "match",
    studentId,
    dateKey,
    completedAt: "2026-07-10T10:00:00.000Z",
    percent: 80,
    wordItemIds: ["w1", "w2"],
    outcomes: {
      w1: { kind: "success", attemptsToSuccess: 1 },
      w2: { kind: "revealed" },
    },
    match: {
      lockedSelections: {
        w1: "meaning one",
        w2: "meaning two",
      },
    },
  };

  beforeEach(() => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and reads attempt snapshots", () => {
    saveSecondaryActivityAttemptSnapshot(snapshot);
    expect(hasSecondaryActivityAttemptSnapshot("match", studentId, dateKey)).toBe(true);
    expect(getSecondaryActivityAttemptSnapshot("match", studentId, dateKey)).toEqual(snapshot);
  });

  it("clears attempt snapshots", () => {
    saveSecondaryActivityAttemptSnapshot(snapshot);
    clearSecondaryActivityAttemptSnapshot("match", studentId, dateKey);
    expect(hasSecondaryActivityAttemptSnapshot("match", studentId, dateKey)).toBe(false);
  });

  it("detects attempts from completion flag or snapshot", () => {
    expect(hasSecondaryActivityAttempt("match", studentId, dateKey, true)).toBe(true);
    expect(hasSecondaryActivityAttempt("match", studentId, dateKey, false)).toBe(false);
    saveSecondaryActivityAttemptSnapshot(snapshot);
    expect(hasSecondaryActivityAttempt("match", studentId, dateKey, false)).toBe(true);
  });
});
