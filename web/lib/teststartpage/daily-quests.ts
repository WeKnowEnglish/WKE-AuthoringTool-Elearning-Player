import { awardRewards, DAILY_QUEST_XP, getRewards } from "@/lib/progress/rewards";

export const DAILY_QUESTS_STORAGE_KEY = "wke-daily-quests-v1";

export const DAILY_QUEST_PER_GOLD = 10;
export const DAILY_CHEST_GOLD = 100;
export const DAILY_CHEST_XP = 25;

export const DAILY_QUEST_IDS = [
  "chase_levels",
  "bucket_catches",
  "letter_mixup",
  "quiz_completions",
  "chase_wins",
] as const;

export type DailyQuestId = (typeof DAILY_QUEST_IDS)[number];

export const DAILY_QUEST_LABELS: Record<DailyQuestId, string> = {
  chase_levels: "Clear 20 chase levels",
  bucket_catches: "Catch 45 correct objects in Word bucket catch",
  letter_mixup: "Spell 15 words correctly in Letter mix-up",
  quiz_completions: "Finish 2 full topic quizzes",
  chase_wins: "Win the chase game 2 times",
};

const DAILY_QUEST_TARGETS: Record<DailyQuestId, number> = {
  chase_levels: 20,
  bucket_catches: 45,
  letter_mixup: 15,
  quiz_completions: 2,
  chase_wins: 2,
};

export type DailyQuestStored = {
  dayKey: string;
  /** Per-quest progress counters for the current day. */
  progress: Partial<Record<DailyQuestId, number>>;
};

function emptyProgress(): Partial<Record<DailyQuestId, number>> {
  return {};
}

export function getLocalDayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dailyQuestRewardEventId(dayKey: string, questId: DailyQuestId): string {
  return `daily-quest:${dayKey}:${questId}`;
}

export function dailyChestEventId(dayKey: string): string {
  return `daily-chest:${dayKey}`;
}

function readStored(): DailyQuestStored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DAILY_QUESTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailyQuestStored>;
    if (typeof parsed.dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.dayKey)) return null;
    const progress: Partial<Record<DailyQuestId, number>> = {};
    if (parsed.progress && typeof parsed.progress === "object") {
      for (const id of DAILY_QUEST_IDS) {
        const v = (parsed.progress as Record<string, unknown>)[id];
        if (typeof v === "number" && Number.isFinite(v)) {
          progress[id] = Math.max(0, Math.floor(v));
        }
      }
    }
    return { dayKey: parsed.dayKey, progress };
  } catch {
    return null;
  }
}

function writeStored(next: DailyQuestStored) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_QUESTS_STORAGE_KEY, JSON.stringify(next));
}

/** Ensures stored state matches `todayKey`; resets counters on a new local day. */
export function ensureDailyQuestDay(todayKey = getLocalDayKey()): DailyQuestStored {
  const cur = readStored();
  if (!cur || cur.dayKey !== todayKey) {
    const fresh: DailyQuestStored = { dayKey: todayKey, progress: emptyProgress() };
    writeStored(fresh);
    return fresh;
  }
  return cur;
}

function capProgress(id: DailyQuestId, n: number): number {
  const cap = DAILY_QUEST_TARGETS[id];
  return Math.min(Math.max(0, n), cap);
}

export function getQuestTarget(id: DailyQuestId): number {
  return DAILY_QUEST_TARGETS[id];
}

/**
 * Adds `delta` to a quest counter for today, persists, and grants the small quest gold
 * the first time the target is reached (idempotent via `rewardedEventIds`).
 */
export function bumpDailyQuestProgress(
  questId: DailyQuestId,
  delta: number,
  todayKey = getLocalDayKey(),
): DailyQuestStored {
  const day = ensureDailyQuestDay(todayKey);
  const prev = day.progress[questId] ?? 0;
  const nextVal = capProgress(questId, prev + Math.max(0, delta));
  const next: DailyQuestStored = {
    dayKey: day.dayKey,
    progress: { ...day.progress, [questId]: nextVal },
  };
  writeStored(next);

  if (nextVal >= DAILY_QUEST_TARGETS[questId]) {
    awardRewards({
      goldDelta: DAILY_QUEST_PER_GOLD,
      experienceDelta: DAILY_QUEST_XP,
      eventId: dailyQuestRewardEventId(todayKey, questId),
    });
  }

  return next;
}

export function allDailyQuestTargetsMet(state: DailyQuestStored, dayKey: string): boolean {
  if (state.dayKey !== dayKey) return false;
  return DAILY_QUEST_IDS.every((id) => (state.progress[id] ?? 0) >= DAILY_QUEST_TARGETS[id]);
}

/** True if the chest loot for `dayKey` was already granted (stored on rewards snapshot). */
export function isDailyChestClaimed(dayKey: string): boolean {
  return getRewards().rewardedEventIds.includes(dailyChestEventId(dayKey));
}

/**
 * Grants chest gold + XP once per day when all five quest targets are met.
 * Returns whether this call granted the loot (false if already claimed or quests incomplete).
 */
export function openDailyTreasureChest(todayKey = getLocalDayKey()): boolean {
  const state = ensureDailyQuestDay(todayKey);
  if (!allDailyQuestTargetsMet(state, todayKey)) return false;
  const before = getRewards();
  const eventId = dailyChestEventId(todayKey);
  if (before.rewardedEventIds.includes(eventId)) return false;
  awardRewards({
    goldDelta: DAILY_CHEST_GOLD,
    experienceDelta: DAILY_CHEST_XP,
    eventId,
  });
  return true;
}

export type DailyQuestRowUi = {
  id: DailyQuestId;
  label: string;
  current: number;
  target: number;
  /** Progress target reached (may still be waiting for user to open chest). */
  targetMet: boolean;
  /** Small per-quest 10g payout recorded for this day. */
  smallRewardGranted: boolean;
};

export function getDailyQuestUiRows(todayKey = getLocalDayKey()): {
  dayKey: string;
  rows: DailyQuestRowUi[];
  allTargetsMet: boolean;
  chestLootClaimed: boolean;
  chestOpenable: boolean;
} {
  const state = ensureDailyQuestDay(todayKey);
  const ids = getRewards().rewardedEventIds;
  const rows: DailyQuestRowUi[] = DAILY_QUEST_IDS.map((id) => {
    const current = state.progress[id] ?? 0;
    const target = DAILY_QUEST_TARGETS[id];
    return {
      id,
      label: DAILY_QUEST_LABELS[id],
      current,
      target,
      targetMet: current >= target,
      smallRewardGranted: ids.includes(dailyQuestRewardEventId(todayKey, id)),
    };
  });
  const allTargetsMet = allDailyQuestTargetsMet(state, todayKey);
  const chestLootClaimed = isDailyChestClaimed(todayKey);
  const chestOpenable = allTargetsMet && !chestLootClaimed;
  return { dayKey: todayKey, rows, allTargetsMet, chestLootClaimed, chestOpenable };
}
