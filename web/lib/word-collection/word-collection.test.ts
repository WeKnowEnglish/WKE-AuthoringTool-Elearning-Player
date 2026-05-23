import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REWARDS_STORAGE_KEY } from "@/lib/progress/rewards";
import { WORD_COLLECTION_STORAGE_KEY } from "./types";
import {
  grantWordLoot,
  getUpgradePreview,
  upgradeWord,
  listCollectedWords,
} from "./storage";

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

function seedGold(gold: number) {
  localStorage.setItem(
    REWARDS_STORAGE_KEY,
    JSON.stringify({
      gold,
      experience: 0,
      rewardedEventIds: [],
      ownedStickerIds: [],
    }),
  );
}

describe("word-collection", () => {
  beforeEach(() => {
    installMemoryStorage();
    seedGold(500);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("grantWordLoot creates tier-1 word and stacks count", () => {
    const first = grantWordLoot("apple", 1);
    expect(first?.tier).toBe(1);
    expect(first?.count).toBe(1);
    const second = grantWordLoot("apple", 2);
    expect(second?.count).toBe(3);
    expect(listCollectedWords()).toHaveLength(1);
  });

  it("upgradeWord requires count and gold", () => {
    grantWordLoot("banana", 2);
    let preview = getUpgradePreview("banana");
    expect(preview.canUpgrade).toBe(false);
    expect(preview.missingCount).toBe(1);

    grantWordLoot("banana", 1);
    preview = getUpgradePreview("banana");
    expect(preview.canUpgrade).toBe(true);
    expect(preview.nextTier).toBe(2);

    const result = upgradeWord("banana");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.word.tier).toBe(2);
      expect(result.word.count).toBe(3);
    }
  });

  it("upgradeWord fails without enough gold", () => {
    seedGold(0);
    grantWordLoot("cat", 5);
    const result = upgradeWord("cat");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("need_gold");
  });
});
