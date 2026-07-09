import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import { filterWordItemIdsForSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import { getAllSecondaryWordItemIds } from "@/lib/secondary/secondary-vocab-bank";

export const SECONDARY_SENTENCE_WORDS_PER_SESSION = 5;

const SENTENCE_PLAYED_PREFIX = "secondary-sentence-played-v1:";
const SENTENCE_RUN_PREFIX = "secondary-sentence-run-v1:";

export type SecondarySentenceRun = {
  wordItemIds: string[];
  runIndex: number;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function playedStorageKey(studentId: string): string {
  return `${SENTENCE_PLAYED_PREFIX}${studentId}`;
}

function runStorageKey(studentId: string, dateKey: string): string {
  return `${SENTENCE_RUN_PREFIX}${studentId}:${dateKey}`;
}

export function getSecondarySentenceEligibleWordIds(): string[] {
  return filterWordItemIdsForSecondaryActivity(getAllSecondaryWordItemIds(), "sentence");
}

export function readSecondarySentencePlayedWordIds(studentId: string): string[] {
  if (!canUseLocalStorage() || !studentId) return [];

  try {
    const raw = localStorage.getItem(playedStorageKey(studentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.length > 0);
  } catch {
    return [];
  }
}

export function writeSecondarySentencePlayedWordIds(studentId: string, wordItemIds: string[]): void {
  if (!canUseLocalStorage() || !studentId) return;

  try {
    localStorage.setItem(playedStorageKey(studentId), JSON.stringify(wordItemIds));
  } catch {
    // ignore quota
  }
}

export function addSecondarySentencePlayedWordIds(studentId: string, wordItemIds: string[]): void {
  const existing = new Set(readSecondarySentencePlayedWordIds(studentId));
  for (const wordItemId of wordItemIds) {
    existing.add(wordItemId);
  }
  writeSecondarySentencePlayedWordIds(studentId, [...existing]);
}

export function readSecondarySentenceRun(
  studentId: string,
  dateKey: string,
): SecondarySentenceRun | null {
  if (!canUseLocalStorage() || !studentId || !dateKey) return null;

  try {
    const raw = localStorage.getItem(runStorageKey(studentId, dateKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SecondarySentenceRun>;
    if (!Array.isArray(parsed.wordItemIds)) return null;
    const wordItemIds = parsed.wordItemIds.filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    if (wordItemIds.length === 0) return null;
    const runIndex =
      typeof parsed.runIndex === "number" && Number.isFinite(parsed.runIndex) && parsed.runIndex >= 0
        ? parsed.runIndex
        : 0;
    return { wordItemIds, runIndex };
  } catch {
    return null;
  }
}

export function writeSecondarySentenceRun(
  studentId: string,
  dateKey: string,
  run: SecondarySentenceRun,
): void {
  if (!canUseLocalStorage() || !studentId || !dateKey) return;

  try {
    localStorage.setItem(runStorageKey(studentId, dateKey), JSON.stringify(run));
  } catch {
    // ignore quota
  }
}

export function pickSecondarySentenceWordIds(input: {
  eligibleWordIds: readonly string[];
  playedWordIds: readonly string[];
  count: number;
  seed: string;
}): string[] {
  const count = Math.max(0, input.count);
  if (count === 0 || input.eligibleWordIds.length === 0) return [];

  const played = new Set(input.playedWordIds);
  const unused = input.eligibleWordIds.filter((wordItemId) => !played.has(wordItemId));
  const pool = unused.length > 0 ? unused : [...input.eligibleWordIds];
  return shuffleWithSeed(pool, input.seed).slice(0, Math.min(count, pool.length));
}

export function resolveSecondarySentenceWordRun(input: {
  studentId: string;
  dateKey: string;
  forceNewRun?: boolean;
}): SecondarySentenceRun {
  const eligibleWordIds = getSecondarySentenceEligibleWordIds();
  const existingRun = readSecondarySentenceRun(input.studentId, input.dateKey);

  if (!input.forceNewRun && existingRun) {
    return existingRun;
  }

  const playedWordIds = readSecondarySentencePlayedWordIds(input.studentId);
  const runIndex = input.forceNewRun ? (existingRun?.runIndex ?? 0) + 1 : (existingRun?.runIndex ?? 0);
  const seed = `${input.studentId}:${input.dateKey}:sentence:r${runIndex}`;
  const wordItemIds = pickSecondarySentenceWordIds({
    eligibleWordIds,
    playedWordIds,
    count: SECONDARY_SENTENCE_WORDS_PER_SESSION,
    seed,
  });

  const run = { wordItemIds, runIndex };
  writeSecondarySentenceRun(input.studentId, input.dateKey, run);
  addSecondarySentencePlayedWordIds(input.studentId, wordItemIds);
  return run;
}
