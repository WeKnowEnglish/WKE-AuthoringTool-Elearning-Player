import { learningTargetKey } from "@/lib/mastery/engine";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import {
  buildCandidate,
  SECONDARY_SELECTION_VERSION,
  type SecondaryWordBucket,
  type SecondaryWordCandidate,
} from "@/lib/secondary/secondary-session-selection";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import type { SecondaryTodaySession, SecondaryVocabItem } from "@/lib/secondary/types";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

/** FIFO eviction starts when this many today words are mastered on the list. */
export const SLOW_REPLACE_MASTERED_THRESHOLD = 3;

/** Prefer replacements within this difficulty delta of the evicted word. */
export const SLOW_REPLACE_SIMILAR_DIFFICULTY_DELTA = 1;

/** Every Nth replacement may stretch one step above the evicted word's difficulty. */
export const SLOW_REPLACE_STRETCH_EVERY = 3;

const BUCKET_PRIORITY: Record<Exclude<SecondaryWordBucket, "mastered">, number> = {
  due: 0,
  fragile: 1,
  new: 2,
  refresh: 3,
};

export type SlowReplaceSwap = {
  outWordItemId: string;
  inWordItemId: string;
};

export type SlowReplaceResult = {
  session: SecondaryTodaySession;
  changed: boolean;
  swaps: SlowReplaceSwap[];
};

function masteryRecordForWord(
  wordItemId: string,
  masteryRecords: Record<string, StudentMasteryRecord>,
): StudentMasteryRecord | null {
  const targetKey = learningTargetKey({ type: "word", key: wordItemId });
  return masteryRecords[targetKey] ?? null;
}

export function isWordMasteredForSlowReplace(
  wordItemId: string,
  masteryRecords: Record<string, StudentMasteryRecord>,
): boolean {
  const record = masteryRecordForWord(wordItemId, masteryRecords);
  return (record?.masteryScore ?? 0) >= 0.75;
}

function compareWeakest(a: SecondaryWordCandidate, b: SecondaryWordCandidate): number {
  if (a.masteryScore !== b.masteryScore) return a.masteryScore - b.masteryScore;
  if (a.recentAccuracy !== b.recentAccuracy) return a.recentAccuracy - b.recentAccuracy;
  if (a.exposureCount !== b.exposureCount) return a.exposureCount - b.exposureCount;
  return a.wordItemId.localeCompare(b.wordItemId);
}

function isSimilarToEvicted(
  evicted: SecondaryVocabItem | undefined,
  candidate: SecondaryVocabItem,
): boolean {
  if (!evicted) return false;
  if (evicted.topicId !== candidate.topicId) return false;
  return (
    Math.abs(evicted.difficulty - candidate.difficulty) <= SLOW_REPLACE_SIMILAR_DIFFICULTY_DELTA
  );
}

function isStretchCandidate(
  evicted: SecondaryVocabItem | undefined,
  candidate: SecondaryVocabItem,
): boolean {
  if (!evicted) return candidate.difficulty >= 3;
  return candidate.difficulty > evicted.difficulty;
}

function bucketRank(bucket: SecondaryWordBucket): number {
  if (bucket === "mastered") return 99;
  return BUCKET_PRIORITY[bucket];
}

function buildEligibleCandidates(
  candidateWordItemIds: string[],
  excludedWordItemIds: Set<string>,
  masteryRecords: Record<string, StudentMasteryRecord>,
  now: Date,
): SecondaryWordCandidate[] {
  return candidateWordItemIds
    .filter((wordItemId) => !excludedWordItemIds.has(wordItemId))
    .map((wordItemId) =>
      buildCandidate(wordItemId, masteryRecordForWord(wordItemId, masteryRecords), now),
    )
    .filter((candidate) => candidate.bucket !== "mastered");
}

function pickFromPool(
  pool: SecondaryWordCandidate[],
  studentId: string,
  dateKey: string,
  seedSuffix: string,
): string | null {
  if (pool.length === 0) return null;
  const shuffled = shuffleWithSeed(
    [...pool].sort(compareWeakest),
    `${studentId}:${dateKey}:slow-replace:${seedSuffix}`,
  );
  return shuffled[0]?.wordItemId ?? null;
}

export function pickSlowReplaceWord(input: {
  evictedWordItemId: string;
  candidateWordItemIds: string[];
  excludedWordItemIds: Set<string>;
  masteryRecords: Record<string, StudentMasteryRecord>;
  studentId: string;
  dateKey: string;
  now: Date;
  replacementIndex: number;
}): string | null {
  const evictedItem = getSecondaryVocabItemById(input.evictedWordItemId);
  const eligible = buildEligibleCandidates(
    input.candidateWordItemIds,
    input.excludedWordItemIds,
    input.masteryRecords,
    input.now,
  );

  if (eligible.length === 0) return null;

  const stretchPick =
    input.replacementIndex > 0 &&
    input.replacementIndex % SLOW_REPLACE_STRETCH_EVERY === 0;

  if (stretchPick) {
    const stretchPool = eligible.filter((candidate) => {
      const item = getSecondaryVocabItemById(candidate.wordItemId);
      return item ? isStretchCandidate(evictedItem, item) : false;
    });
    const stretchPickId = pickFromPool(
      stretchPool,
      input.studentId,
      input.dateKey,
      `stretch:${input.replacementIndex}`,
    );
    if (stretchPickId) return stretchPickId;
  }

  const similarPool = eligible.filter((candidate) => {
    const item = getSecondaryVocabItemById(candidate.wordItemId);
    return item ? isSimilarToEvicted(evictedItem, item) : false;
  });
  const similarPickId = pickFromPool(
    similarPool,
    input.studentId,
    input.dateKey,
    `similar:${input.replacementIndex}`,
  );
  if (similarPickId) return similarPickId;

  const practicePool = [...eligible].sort((a, b) => {
    const bucketDiff = bucketRank(a.bucket) - bucketRank(b.bucket);
    if (bucketDiff !== 0) return bucketDiff;
    return compareWeakest(a, b);
  });
  return pickFromPool(
    practicePool,
    input.studentId,
    input.dateKey,
    `practice:${input.replacementIndex}`,
  );
}

function replaceWordInLists(ids: string[], outId: string, inId: string): string[] {
  return ids.map((id) => (id === outId ? inId : id));
}

function syncMasteredOnListOrder(
  todayWordItemIds: string[],
  masteredOnListOrder: string[],
  masteryRecords: Record<string, StudentMasteryRecord>,
): string[] {
  const next = [...masteredOnListOrder];
  const onList = new Set(todayWordItemIds);

  for (const wordItemId of todayWordItemIds) {
    if (!isWordMasteredForSlowReplace(wordItemId, masteryRecords)) continue;
    if (next.includes(wordItemId)) continue;
    next.push(wordItemId);
  }

  return next.filter(
    (wordItemId) =>
      onList.has(wordItemId) && isWordMasteredForSlowReplace(wordItemId, masteryRecords),
  );
}

function sessionsEqual(a: SecondaryTodaySession, b: SecondaryTodaySession): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function reconcileSecondarySessionSlowReplace(input: {
  session: SecondaryTodaySession;
  candidateWordItemIds: string[];
  masteryRecords: Record<string, StudentMasteryRecord>;
  studentId: string;
  now: Date;
}): SlowReplaceResult {
  const dateKey = input.session.dateKey;
  const session: SecondaryTodaySession = {
    ...input.session,
    masteredOnListOrder: [...(input.session.masteredOnListOrder ?? [])],
    replacedOutWordItemIds: [...(input.session.replacedOutWordItemIds ?? [])],
    introducedWordItemIds: [...(input.session.introducedWordItemIds ?? [])],
    selectionVersion: SECONDARY_SELECTION_VERSION,
  };

  session.masteredOnListOrder = syncMasteredOnListOrder(
    session.todayWordItemIds,
    session.masteredOnListOrder ?? [],
    input.masteryRecords,
  );

  const swaps: SlowReplaceSwap[] = [];
  let replacementIndex = session.replacedOutWordItemIds?.length ?? 0;

  while ((session.masteredOnListOrder?.length ?? 0) >= SLOW_REPLACE_MASTERED_THRESHOLD) {
    const outWordItemId = session.masteredOnListOrder!.shift();
    if (!outWordItemId) break;

    const excluded = new Set([
      ...session.allWordItemIds,
      ...(session.replacedOutWordItemIds ?? []),
    ]);

    replacementIndex += 1;
    const inWordItemId = pickSlowReplaceWord({
      evictedWordItemId: outWordItemId,
      candidateWordItemIds: input.candidateWordItemIds,
      excludedWordItemIds: excluded,
      masteryRecords: input.masteryRecords,
      studentId: input.studentId,
      dateKey,
      now: input.now,
      replacementIndex,
    });

    if (!inWordItemId) {
      session.masteredOnListOrder!.unshift(outWordItemId);
      break;
    }

    session.todayWordItemIds = replaceWordInLists(
      session.todayWordItemIds,
      outWordItemId,
      inWordItemId,
    );
    session.allWordItemIds = replaceWordInLists(
      session.allWordItemIds,
      outWordItemId,
      inWordItemId,
    );
    session.replacedOutWordItemIds = [
      ...(session.replacedOutWordItemIds ?? []),
      outWordItemId,
    ];
    session.introducedWordItemIds = [
      ...(session.introducedWordItemIds ?? []),
      inWordItemId,
    ];

    if (isWordMasteredForSlowReplace(inWordItemId, input.masteryRecords)) {
      session.masteredOnListOrder!.push(inWordItemId);
    }

    swaps.push({ outWordItemId, inWordItemId });
  }

  session.masteredOnListOrder = syncMasteredOnListOrder(
    session.todayWordItemIds,
    session.masteredOnListOrder ?? [],
    input.masteryRecords,
  );

  return {
    session,
    changed: !sessionsEqual(input.session, session) || swaps.length > 0,
    swaps,
  };
}
