import { resolveWordItemIdFromLegacyWord } from "@/lib/secondary/secondary-vocab-bank";
import type {
  SecondaryWordAttempt,
  SecondaryWordProgressRecord,
  WordMasteryLevel,
} from "@/lib/secondary/types";

const WORD_PROGRESS_STORAGE_KEY_PREFIX = "secondary-vocab-word-progress-v1:";
const STUDENT_ID_STORAGE_KEY = "secondary-vocab-student-id-v1";
const MASTERY_LEVELS: WordMasteryLevel[] = [0, 1, 2, 3, 4, 5];

const SUCCESS_INTERVAL_DAYS_BY_LEVEL: Record<WordMasteryLevel, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 7,
  4: 14,
  5: 30,
};

export function resolveSecondaryStudentId(): string {
  if (typeof window === "undefined") return "server";

  try {
    const existing = localStorage.getItem(STUDENT_ID_STORAGE_KEY);
    if (existing && existing.trim()) return existing;
  } catch {
    // ignore
  }

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `anon_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  try {
    localStorage.setItem(STUDENT_ID_STORAGE_KEY, next);
  } catch {
    // ignore
  }

  return next;
}

function getWordProgressStorageKey(studentId: string): string {
  return `${WORD_PROGRESS_STORAGE_KEY_PREFIX}${studentId}`;
}

function clampMasteryLevel(level: number): WordMasteryLevel {
  if (!Number.isFinite(level)) return 0;
  const asInt = Math.max(0, Math.min(5, Math.floor(level)));
  return MASTERY_LEVELS.includes(asInt as WordMasteryLevel)
    ? (asInt as WordMasteryLevel)
    : 0;
}

function makeNewWordProgress(wordItemId: string): SecondaryWordProgressRecord {
  return {
    wordItemId,
    masteryLevel: 0,
    timesSeen: 0,
    timesCorrect: 0,
    correctStreak: 0,
    recentAccuracy: 0,
    lastPracticedAt: undefined,
    nextReviewAt: new Date().toISOString(),
  };
}

function hydrateProgressRecord(
  raw: unknown,
  fallbackWordItemId: string,
): SecondaryWordProgressRecord {
  if (!raw || typeof raw !== "object") return makeNewWordProgress(fallbackWordItemId);

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

function readAllProgress(storageKey: string): Record<string, SecondaryWordProgressRecord> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return migrateLegacyProgressMap(parsed);
  } catch {
    return {};
  }
}

function writeAllProgress(
  storageKey: string,
  next: Record<string, SecondaryWordProgressRecord>,
): void {
  localStorage.setItem(storageKey, JSON.stringify(next));
}

function applyAttemptToProgress(
  previous: SecondaryWordProgressRecord,
  attempt: SecondaryWordAttempt,
  now: Date,
): SecondaryWordProgressRecord {
  const nextTimesSeen = previous.timesSeen + 1;
  const nextTimesCorrect = previous.timesCorrect + (attempt.isCorrect ? 1 : 0);
  const nextCorrectStreak = attempt.isCorrect ? previous.correctStreak + 1 : 0;

  let nextLevel = previous.masteryLevel;
  if (attempt.isCorrect) {
    if (nextCorrectStreak >= 2 && nextLevel < 5) {
      nextLevel = (nextLevel + 1) as WordMasteryLevel;
    }
  } else if (nextLevel > 0) {
    nextLevel = (nextLevel - 1) as WordMasteryLevel;
  }

  const nextRecentAccuracy = nextTimesSeen ? nextTimesCorrect / nextTimesSeen : 0;
  const nextReviewAt = attempt.isCorrect
    ? new Date(
        now.getTime() +
          SUCCESS_INTERVAL_DAYS_BY_LEVEL[nextLevel] * 24 * 60 * 60 * 1000,
      ).toISOString()
    : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    ...previous,
    wordItemId: attempt.wordItemId,
    masteryLevel: clampMasteryLevel(nextLevel),
    timesSeen: nextTimesSeen,
    timesCorrect: nextTimesCorrect,
    correctStreak: nextCorrectStreak,
    recentAccuracy: nextRecentAccuracy,
    lastPracticedAt: now.toISOString(),
    nextReviewAt,
  };
}

export function getSecondaryWordProgressRecord(
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

export function recordSecondaryWordAttempt(
  attempt: SecondaryWordAttempt,
): SecondaryWordProgressRecord {
  if (typeof window === "undefined") return makeNewWordProgress(attempt.wordItemId);

  const studentId = resolveSecondaryStudentId();
  const storageKey = getWordProgressStorageKey(studentId);
  const now = new Date(attempt.attemptedAt);
  const existing = readAllProgress(storageKey);
  const previous = existing[attempt.wordItemId];
  const next = applyAttemptToProgress(
    previous ?? makeNewWordProgress(attempt.wordItemId),
    attempt,
    now,
  );

  existing[attempt.wordItemId] = next;
  writeAllProgress(storageKey, existing);
  return next;
}

export function mapMasteryLevelToLabel(level: WordMasteryLevel): string {
  if (level === 0) return "New";
  if (level === 1) return "Seen";
  if (level === 2) return "Recognized";
  if (level === 3) return "Practiced";
  if (level === 4) return "Strong";
  return "Mastered";
}
