import type { StudentMasteryRecord } from "@/lib/mastery/types";
import { clozeClauseScoreForItem } from "@/lib/secondary/secondary-cloze-coverage";
import { isWordMasteredForSlowReplace } from "@/lib/secondary/secondary-session-slow-replace";
import { getAllSecondaryVocabItems } from "@/lib/secondary/secondary-vocab-bank";
import type { SecondaryVocabItem } from "@/lib/secondary/types";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

export function orderClozePickedItems(items: SecondaryVocabItem[]): SecondaryVocabItem[] {
  return [...items].sort((a, b) => {
    const difficultyDiff = a.difficulty - b.difficulty;
    if (difficultyDiff !== 0) return difficultyDiff;
    return a.wordItemId.localeCompare(b.wordItemId);
  });
}

/** Topics present in the session pool, richest first. */
export function rankSessionTopicsByCount(sessionPool: SecondaryVocabItem[]): string[] {
  const groups = new Map<string, SecondaryVocabItem[]>();
  for (const item of sessionPool) {
    const bucket = groups.get(item.topicId) ?? [];
    bucket.push(item);
    groups.set(item.topicId, bucket);
  }

  return [...groups.entries()]
    .sort((a, b) => {
      const countDiff = b[1].length - a[1].length;
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    })
    .map(([topicId]) => topicId);
}

export function buildMasteredFillerPoolForTopic(input: {
  topicId: string;
  sessionWordItemIds: Set<string>;
  masteryRecords: Record<string, StudentMasteryRecord>;
}): SecondaryVocabItem[] {
  const { topicId, sessionWordItemIds, masteryRecords } = input;

  return getAllSecondaryVocabItems()
    .filter((item) => item.topicId === topicId)
    .filter((item) => !sessionWordItemIds.has(item.wordItemId))
    .filter((item) => clozeClauseScoreForItem(item) > 0)
    .filter((item) => isWordMasteredForSlowReplace(item.wordItemId, masteryRecords))
    .sort((a, b) => {
      const scoreDiff = clozeClauseScoreForItem(b) - clozeClauseScoreForItem(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.wordItemId.localeCompare(b.wordItemId);
    });
}

export type ClozeTopicFillResult = {
  picked: SecondaryVocabItem[];
  sessionBlankIds: string[];
  fillerBlankIds: string[];
  primaryTopicId: string;
};

export function fillClozeBlanksForTopic(input: {
  topicId: string;
  sessionPool: SecondaryVocabItem[];
  sessionWordItemIds: Set<string>;
  masteryRecords: Record<string, StudentMasteryRecord>;
  seed: string;
  targetBlanks: number;
  minBlanks: number;
  maxBlanks: number;
}): ClozeTopicFillResult | null {
  const {
    topicId,
    sessionPool,
    sessionWordItemIds,
    masteryRecords,
    seed,
    targetBlanks,
    minBlanks,
    maxBlanks,
  } = input;

  const sessionInTopic = sessionPool.filter((item) => item.topicId === topicId);
  const fillers = buildMasteredFillerPoolForTopic({
    topicId,
    sessionWordItemIds,
    masteryRecords,
  });

  const goal = Math.min(targetBlanks, maxBlanks);
  const sessionPicked = shuffleWithSeed(sessionInTopic, `${seed}:session`).slice(0, goal);
  const remaining = goal - sessionPicked.length;
  const fillerPicked =
    remaining > 0
      ? shuffleWithSeed(fillers, `${seed}:fillers`).slice(0, remaining)
      : [];

  const picked = orderClozePickedItems([...sessionPicked, ...fillerPicked]);
  if (picked.length < minBlanks) return null;

  return {
    picked,
    sessionBlankIds: sessionPicked.map((item) => item.wordItemId),
    fillerBlankIds: fillerPicked.map((item) => item.wordItemId),
    primaryTopicId: topicId,
  };
}

export function compileClozePickWithTopicRotation(input: {
  sessionPool: SecondaryVocabItem[];
  sessionWordItemIds: string[];
  masteryRecords: Record<string, StudentMasteryRecord>;
  seed: string;
  replayIndex: number;
  targetBlanks: number;
  minBlanks: number;
  maxBlanks: number;
}): ClozeTopicFillResult | null {
  const rankedTopics = rankSessionTopicsByCount(input.sessionPool);
  if (rankedTopics.length === 0) return null;

  const sessionWordItemIds = new Set(input.sessionWordItemIds);
  const startIndex = input.replayIndex % rankedTopics.length;

  for (let offset = 0; offset < rankedTopics.length; offset += 1) {
    const topicId = rankedTopics[(startIndex + offset) % rankedTopics.length]!;
    const result = fillClozeBlanksForTopic({
      topicId,
      sessionPool: input.sessionPool,
      sessionWordItemIds,
      masteryRecords: input.masteryRecords,
      seed: `${input.seed}:${topicId}`,
      targetBlanks: input.targetBlanks,
      minBlanks: input.minBlanks,
      maxBlanks: input.maxBlanks,
    });
    if (result) return result;
  }

  return null;
}
