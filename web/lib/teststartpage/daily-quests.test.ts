import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DAILY_QUESTS_STORAGE_KEY,
  DAILY_CHEST_GOLD,
  DAILY_CHEST_XP,
  DAILY_QUEST_PER_GOLD,
  bumpDailyQuestProgress,
  dailyQuestRewardEventId,
  getDailyQuestUiRows,
  getLocalDayKey,
  openDailyTreasureChest,
} from "./daily-quests";
import { DAILY_QUEST_XP, REWARDS_STORAGE_KEY, getRewards } from "@/lib/progress/rewards";

const FIXED_DAY = "2030-06-15";

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

function seedRewards(gold = 0, ids: string[] = []) {
  localStorage.setItem(
    REWARDS_STORAGE_KEY,
    JSON.stringify({
      gold,
      experience: 0,
      rewardedEventIds: ids,
      ownedStickerIds: [],
      quizEnergy: 0,
      quizStreak: 0,
    }),
  );
}

describe("daily-quests", () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    seedRewards(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("bumps progress and grants small gold once when target is first reached", () => {
    for (let i = 0; i < 14; i += 1) {
      bumpDailyQuestProgress("letter_mixup", 1, FIXED_DAY);
    }
    expect(getRewards().gold).toBe(0);
    bumpDailyQuestProgress("letter_mixup", 1, FIXED_DAY);
    expect(getRewards().gold).toBe(DAILY_QUEST_PER_GOLD);
    expect(getRewards().experience).toBe(DAILY_QUEST_XP);
    bumpDailyQuestProgress("letter_mixup", 5, FIXED_DAY);
    expect(getRewards().gold).toBe(DAILY_QUEST_PER_GOLD);
    expect(getRewards().experience).toBe(DAILY_QUEST_XP);
  });

  it("does not double-grant quest reward via event id", () => {
    seedRewards(0, [dailyQuestRewardEventId(FIXED_DAY, "chase_wins")]);
    bumpDailyQuestProgress("chase_wins", 2, FIXED_DAY);
    expect(getRewards().gold).toBe(0);
  });

  it("opens chest once when all targets met", () => {
    bumpDailyQuestProgress("chase_levels", 20, FIXED_DAY);
    bumpDailyQuestProgress("bucket_catches", 45, FIXED_DAY);
    bumpDailyQuestProgress("letter_mixup", 15, FIXED_DAY);
    bumpDailyQuestProgress("quiz_completions", 2, FIXED_DAY);
    bumpDailyQuestProgress("chase_wins", 2, FIXED_DAY);

    const gBefore = getRewards().gold;
    const xpBefore = getRewards().experience;
    expect(openDailyTreasureChest(FIXED_DAY)).toBe(true);
    const g = getRewards().gold;
    expect(g - gBefore).toBe(DAILY_CHEST_GOLD);
    expect(getRewards().experience - xpBefore).toBe(DAILY_CHEST_XP);
    expect(openDailyTreasureChest(FIXED_DAY)).toBe(false);
  });

  it("resets progress on a new day key in storage", () => {
    bumpDailyQuestProgress("letter_mixup", 10, FIXED_DAY);
    localStorage.setItem(
      DAILY_QUESTS_STORAGE_KEY,
      JSON.stringify({ dayKey: "2030-06-14", progress: { letter_mixup: 99 } }),
    );
    const ui = getDailyQuestUiRows(FIXED_DAY);
    expect(ui.rows.find((r) => r.id === "letter_mixup")!.current).toBe(0);
  });

  it("getLocalDayKey matches YYYY-MM-DD", () => {
    const k = getLocalDayKey(new Date(2030, 5, 9));
    expect(k).toBe("2030-06-09");
  });
});
