import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSecondaryClozeReplayIndex,
  getSecondaryClozeReplayIndex,
  incrementSecondaryClozeReplayIndex,
  setSecondaryClozeReplayIndex,
} from "@/lib/secondary/secondary-cloze-replay-index";

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

describe("secondary-cloze-replay-index", () => {
  const studentId = "student-a";
  const dateKey = "2026-07-10";

  beforeEach(() => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts at zero and increments", () => {
    clearSecondaryClozeReplayIndex(studentId, dateKey);
    expect(getSecondaryClozeReplayIndex(studentId, dateKey)).toBe(0);
    expect(incrementSecondaryClozeReplayIndex(studentId, dateKey)).toBe(1);
    expect(getSecondaryClozeReplayIndex(studentId, dateKey)).toBe(1);
  });

  it("persists explicit values", () => {
    setSecondaryClozeReplayIndex(studentId, dateKey, 3);
    expect(getSecondaryClozeReplayIndex(studentId, dateKey)).toBe(3);
    clearSecondaryClozeReplayIndex(studentId, dateKey);
  });
});
