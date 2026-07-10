import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAnnouncedSwaps,
  filterUnannouncedSwaps,
  getAnnouncedSwapKeys,
  markSwapAnnounced,
  swapAnnouncementKey,
  SWAP_ANNOUNCED_PREFIX,
} from "@/lib/secondary/secondary-swap-announcement";

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

describe("secondary-swap-announcement", () => {
  const studentId = "student-a";
  const dateKey = "2026-07-10";
  const swap = { outWordItemId: "w1", inWordItemId: "w9" };

  beforeEach(() => {
    const localStorage = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal("window", Object.assign(globalThis, { localStorage }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds swap announcement keys", () => {
    expect(swapAnnouncementKey("w1", "w9")).toBe("w1:w9");
  });

  it("marks and reads announced swaps", () => {
    markSwapAnnounced(studentId, dateKey, swap);
    expect(getAnnouncedSwapKeys(studentId, dateKey)).toEqual(
      new Set([swapAnnouncementKey(swap.outWordItemId, swap.inWordItemId)]),
    );
    expect(localStorage.getItem(`${SWAP_ANNOUNCED_PREFIX}${studentId}:${dateKey}`)).toBe(
      JSON.stringify(["w1:w9"]),
    );
  });

  it("filters announced swaps", () => {
    markSwapAnnounced(studentId, dateKey, swap);
    const announced = getAnnouncedSwapKeys(studentId, dateKey);
    expect(
      filterUnannouncedSwaps(
        [swap, { outWordItemId: "w2", inWordItemId: "w8" }],
        announced,
      ),
    ).toEqual([{ outWordItemId: "w2", inWordItemId: "w8" }]);
  });

  it("isolates students and dates", () => {
    markSwapAnnounced(studentId, dateKey, swap);
    expect(getAnnouncedSwapKeys("student-b", dateKey).size).toBe(0);
    expect(getAnnouncedSwapKeys(studentId, "2026-07-11").size).toBe(0);
  });

  it("clears announced swaps", () => {
    markSwapAnnounced(studentId, dateKey, swap);
    clearAnnouncedSwaps(studentId, dateKey);
    expect(getAnnouncedSwapKeys(studentId, dateKey).size).toBe(0);
  });
});
