import { resolveWordItemIdFromLegacyWord } from "@/lib/secondary/secondary-vocab-bank";
import {
  getWordProgressStorageKey,
  resolveSecondaryStudentId,
} from "@/lib/secondary/secondary-student-id";
import type { SecondaryWordProgressRecord, WordMasteryLevel } from "@/lib/secondary/types";

const MASTERY_LEVELS: WordMasteryLevel[] = [0, 1, 2, 3, 4, 5];

function clampMasteryLevel(level: number): WordMasteryLevel {
  if (!Number.isFinite(level)) return 0;
  const asInt = Math.max(0, Math.min(5, Math.floor(level)));
  return MASTERY_LEVELS.includes(asInt as WordMasteryLevel)
    ? (asInt as WordMasteryLevel)
    : 0;
}

function hydrateProgressRecord(
  raw: unknown,
  fallbackWordItemId: string,
): SecondaryWordProgressRecord {
  if (!raw || typeof raw !== "object") {
    return {
      wordItemId: fallbackWordItemId,
      masteryLevel: 0,
      timesSeen: 0,
      timesCorrect: 0,
      correctStreak: 0,
      recentAccuracy: 0,
    };
  }

  const input = raw as Record<string, unknown>;
  const wordItemId =
    typeof input.wordItemId === "string"
      ? input.wordItemId
      : typeof input.wordId === "string"
        ? input.wordId
        : fallbackWordItemId;

  return {
    wordItemId,
    masteryLevel: clampMasteryLevel(
      typeof input.masteryLevel === "number" ? input.masteryLevel : 0,
    ),
    timesSeen: typeof input.timesSeen === "number" ? input.timesSeen : 0,
    timesCorrect: typeof input.timesCorrect === "number" ? input.timesCorrect : 0,
    correctStreak: typeof input.correctStreak === "number" ? input.correctStreak : 0,
    recentAccuracy: typeof input.recentAccuracy === "number" ? input.recentAccuracy : 0,
    lastPracticedAt:
      typeof input.lastPracticedAt === "string" ? input.lastPracticedAt : undefined,
    nextReviewAt: typeof input.nextReviewAt === "string" ? input.nextReviewAt : undefined,
  };
}

function migrateLegacyProgressMap(
  parsed: Record<string, unknown>,
): Record<string, SecondaryWordProgressRecord> {
  const next: Record<string, SecondaryWordProgressRecord> = {};

  for (const [key, value] of Object.entries(parsed)) {
    const looksLikeWordItemId = key.startsWith("g7-a2-");
    const mappedId = looksLikeWordItemId ? key : resolveWordItemIdFromLegacyWord(key);
    const wordItemId = mappedId ?? (looksLikeWordItemId ? key : undefined);
    if (!wordItemId) continue;

    const record = hydrateProgressRecord(value, wordItemId);
    const existing = next[wordItemId];
    if (!existing || record.timesSeen >= existing.timesSeen) {
      next[wordItemId] = { ...record, wordItemId };
    }
  }

  return next;
}

/** Read-only legacy 0–5 store (M5 fallback for pre-migration rows). */
export function readLegacySecondaryWordProgressRecord(
  wordItemId: string,
): SecondaryWordProgressRecord | null {
  if (typeof window === "undefined") return null;

  const studentId = resolveSecondaryStudentId();
  const storageKey = getWordProgressStorageKey(studentId);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const migrated = migrateLegacyProgressMap(parsed);
    return migrated[wordItemId] ?? null;
  } catch {
    return null;
  }
}
