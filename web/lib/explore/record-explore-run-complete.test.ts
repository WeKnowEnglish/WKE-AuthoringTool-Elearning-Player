import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAILY_QUESTS_STORAGE_KEY } from "@/lib/teststartpage/daily-quests";
import { REWARDS_STORAGE_KEY } from "@/lib/progress/rewards";
import { WORD_COLLECTION_STORAGE_KEY } from "@/lib/word-collection/types";
import { WORLD_EXPLORATION_STORAGE_KEY } from "@/lib/worlds/exploration";
import { EXPLORE_PROGRESS_STORAGE_KEY } from "@/lib/explore/explore-progress";
import { recordExploreRunComplete } from "./record-explore-run-complete";

function installMemoryStorage() {
  const store: Record<string, string> = {};
  const ls = {
    getItem: (k: string) => (k in store ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
  vi.stubGlobal("localStorage", ls);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage: ls }));
}

describe("recordExploreRunComplete", () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.setItem(
      REWARDS_STORAGE_KEY,
      JSON.stringify({
        gold: 0,
        experience: 0,
        rewardedEventIds: [],
        ownedStickerIds: [],
      }),
    );
    localStorage.setItem(WORD_COLLECTION_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, words: {} }));
    localStorage.setItem(
      DAILY_QUESTS_STORAGE_KEY,
      JSON.stringify({ dayKey: "2030-01-01", progress: {} }),
    );
    localStorage.setItem(WORLD_EXPLORATION_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, touched: {} }));
    localStorage.setItem(EXPLORE_PROGRESS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("grants run-complete XP idempotently and bumps explore daily quest", () => {
    const first = recordExploreRunComplete({
      areaId: "bedroom",
      runSeed: "run-a",
      encounterGold: 20,
      encounterWordIds: ["bed"],
      encounterTier: "good",
    });
    expect(first.experienceDelta).toBe(5);
    expect(first.encounterGold).toBe(20);

    const quests = JSON.parse(localStorage.getItem(DAILY_QUESTS_STORAGE_KEY)!);
    expect(quests.progress.explore_completions).toBe(1);

    const second = recordExploreRunComplete({
      areaId: "bedroom",
      runSeed: "run-a",
      encounterGold: 20,
      encounterWordIds: ["bed"],
    });
    expect(second.experienceDelta).toBe(0);
  });
});
