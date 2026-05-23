import { describe, expect, it, vi } from "vitest";
import { WORD_COLLECTION_STORAGE_KEY } from "@/lib/word-collection/types";
import {
  getExploreAreaDiscoverySummary,
  getNextExploreAreaId,
  getWorldWordDiscoverySummary,
  isExploreAreaDiscoveryComplete,
  isExploreAreaUnlocked,
} from "./area-discovery";

function seedWords(wordIds: string[]) {
  const words: Record<string, { wordId: string; count: number; tier: number; firstCollectedAt: string; lastCollectedAt: string }> = {};
  const now = new Date().toISOString();
  for (const id of wordIds) {
    words[id] = { wordId: id, count: 1, tier: 1, firstCollectedAt: now, lastCollectedAt: now };
  }
  const ls = {
    getItem: (k: string) => (k === WORD_COLLECTION_STORAGE_KEY ? JSON.stringify({ schemaVersion: 1, words }) : null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };
  vi.stubGlobal("localStorage", ls);
  vi.stubGlobal("window", Object.assign(globalThis, { localStorage: ls }));
}

describe("area-discovery", () => {
  it("bedroom is always unlocked", () => {
    expect(isExploreAreaUnlocked("bedroom")).toBe(true);
  });

  it("school unlocks only after bedroom discovery words are collected", () => {
    seedWords(["bed", "desk", "closet", "lamp", "rug", "window"]);
    expect(isExploreAreaUnlocked("school")).toBe(true);
    expect(isExploreAreaDiscoveryComplete("bedroom")).toBe(true);
  });

  it("school stays locked until bedroom is complete", () => {
    seedWords(["bed"]);
    expect(isExploreAreaUnlocked("school")).toBe(false);
    const summary = getExploreAreaDiscoverySummary("school");
    expect(summary.unlocked).toBe(false);
  });

  it("world percent is based on total discovery words across areas", () => {
    seedWords(["bed", "desk"]);
    const world = getWorldWordDiscoverySummary();
    expect(world.totalWordCount).toBe(18);
    expect(world.discoveredWordCount).toBe(2);
    expect(world.percent).toBe(Math.round((2 / 18) * 100));
    expect(world.areasWithProgress).toContain(1);
  });

  it("getNextExploreAreaId returns first incomplete unlocked area", () => {
    seedWords([]);
    expect(getNextExploreAreaId()).toBe("bedroom");
    seedWords(["bed", "desk", "closet", "lamp", "rug", "window"]);
    expect(getNextExploreAreaId()).toBe("school");
  });
});
