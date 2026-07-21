/**
 * Collaborative Word Cards — domain helpers (WC-1).
 */

import type { ActivityGroupSubmitPolicy } from "@/lib/collaborative-activity/domain";
import {
  toWordCardsRoomId,
  parseWordCardsRoomId,
  WORD_CARDS_ROOM_PREFIX,
  type ActivityRuntimePhase,
  type ActivityWorkStatus,
} from "@/lib/activity-runtime/activity-types";

export { toWordCardsRoomId, parseWordCardsRoomId, WORD_CARDS_ROOM_PREFIX };
export type { ActivityGroupSubmitPolicy };

export type WordCardsRuntimePhase = ActivityRuntimePhase;

export type WordCardsParticipationMode = "individual" | "group";

export type WordCardsModeration = "none" | "pending" | "approved" | "returned";

export type WordCardsWorkStatus = ActivityWorkStatus;

export type WordCardsPrompt = {
  title: string;
  instructions: string;
  successCriteria: string;
};

export type WordCardsRoundSettings = {
  defaultTimerMs: number;
  allowEarlySubmit: boolean;
  anonymousCompareDefault: boolean;
  minDeckSizeForPlay: number;
  groupSubmitPolicy: ActivityGroupSubmitPolicy;
};

export const DEFAULT_WORD_CARDS_PROMPT: WordCardsPrompt = {
  title: "Create a word card",
  instructions: "Create a card for your assigned vocabulary word.",
  successCriteria: "Clear definition and a natural example sentence.",
};

export const DEFAULT_WORD_CARDS_SETTINGS: WordCardsRoundSettings = {
  defaultTimerMs: 4 * 60 * 1000,
  allowEarlySubmit: true,
  anonymousCompareDefault: true,
  minDeckSizeForPlay: 4,
  groupSubmitPolicy: "any_member",
};

export function createWordCardsRoundId(nowMs: number = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `wcrd_${nowMs}_${rand}`;
}

export function cardIdForStudent(userId: string): string {
  return `card:student:${userId}`;
}

export function cardIdForGroup(groupId: string): string {
  return `card:group:${groupId}`;
}

/** Normalize paste / comma / line-separated word lists. */
export function parseWordList(raw: string | string[] | null | undefined): string[] {
  const text = Array.isArray(raw) ? raw.join("\n") : (raw ?? "");
  const parts = text
    .split(/[\n,;]+/g)
    .map((w) => w.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of parts) {
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

/** Round-robin assign; recycles when there are more students than words. */
export function assignWordsRoundRobin(input: {
  wordList: string[];
  studentIds: string[];
}): Record<string, string> {
  const words = input.wordList.filter(Boolean);
  const out: Record<string, string> = {};
  if (words.length === 0) return out;
  input.studentIds.forEach((id, index) => {
    out[id] = words[index % words.length]!;
  });
  return out;
}

/** Collected cards awaiting Approve / Return. */
export function isInClassPile(moderation: WordCardsModeration | string | null | undefined): boolean {
  return moderation === "pending";
}

/** Approved cards — temporary class deck for play. */
export function isInClassDeck(moderation: WordCardsModeration | string | null | undefined): boolean {
  return moderation === "approved";
}

export function deckReadyForPlay(
  approvedCount: number,
  minDeckSize: number = DEFAULT_WORD_CARDS_SETTINGS.minDeckSizeForPlay,
): boolean {
  return approvedCount >= minDeckSize;
}
