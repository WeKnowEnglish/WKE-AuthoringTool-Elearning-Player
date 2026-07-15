import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPublishedQuestionSetsCache,
  LIVE_GAME_PUBLISHED_SETS_CACHE_TTL_MS,
  readPublishedQuestionSetsCache,
  writePublishedQuestionSetsCache,
} from "@/lib/live-game/question-banks/question-sets-api-client";
import type { LiveGameQuestionSetCard } from "@/lib/live-game/question-banks/types";

const sampleSet: LiveGameQuestionSetCard = {
  id: "set-1",
  slug: "sample",
  title: "Sample",
  level: "A1",
  topic: "Topic",
  learningObjective: "Learn",
  description: "Desc",
  version: 1,
  visibility: "system",
  harvestCount: 1,
  depositCount: 1,
  craftCount: 0,
  questionCount: 2,
};

describe("published question set session cache", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        key: (index: number) => [...store.keys()][index] ?? null,
        get length() {
          return store.size;
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scopes cache entries to a teacher id", () => {
    writePublishedQuestionSetsCache("teacher-a", [sampleSet]);
    expect(readPublishedQuestionSetsCache("teacher-a")?.sets).toHaveLength(1);
    expect(readPublishedQuestionSetsCache("teacher-b")).toBeNull();
  });

  it("expires after the TTL", () => {
    writePublishedQuestionSetsCache("teacher-a", [sampleSet]);
    const cached = readPublishedQuestionSetsCache("teacher-a");
    expect(cached).not.toBeNull();
    // Corrupt timestamp to simulate expiry
    const key = [...store.keys()][0]!;
    const parsed = JSON.parse(store.get(key)!) as { cachedAt: number };
    parsed.cachedAt = Date.now() - LIVE_GAME_PUBLISHED_SETS_CACHE_TTL_MS - 1;
    store.set(key, JSON.stringify(parsed));
    expect(readPublishedQuestionSetsCache("teacher-a")).toBeNull();
  });

  it("clears cache for a teacher or all teachers", () => {
    writePublishedQuestionSetsCache("teacher-a", [sampleSet]);
    writePublishedQuestionSetsCache("teacher-b", [sampleSet]);
    clearPublishedQuestionSetsCache("teacher-a");
    expect(readPublishedQuestionSetsCache("teacher-a")).toBeNull();
    expect(readPublishedQuestionSetsCache("teacher-b")?.sets).toHaveLength(1);
    clearPublishedQuestionSetsCache();
    expect(readPublishedQuestionSetsCache("teacher-b")).toBeNull();
  });
});
