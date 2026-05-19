import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  recordVocabSetCompletionDailyQuestProgress,
  recordVocabSpellDailyQuestProgress,
} from "./vocab-daily-quests";
import { getDailyQuestUiRows, getLocalDayKey } from "./daily-quests";
import { REWARDS_STORAGE_KEY } from "@/lib/progress/rewards";

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

describe("vocab-daily-quests", () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    localStorage.setItem(
      REWARDS_STORAGE_KEY,
      JSON.stringify({
        gold: 0,
        experience: 0,
        rewardedEventIds: [],
        ownedStickerIds: [],
        quizEnergy: 0,
        quizStreak: 0,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records spell and set completion toward daily quests", () => {
    const dayKey = getLocalDayKey();
    recordVocabSpellDailyQuestProgress();
    recordVocabSetCompletionDailyQuestProgress();
    const ui = getDailyQuestUiRows(dayKey);
    expect(ui.rows.find((r) => r.id === "letter_mixup")!.current).toBe(1);
    expect(ui.rows.find((r) => r.id === "vocab_set_completions")!.current).toBe(1);
  });
});
