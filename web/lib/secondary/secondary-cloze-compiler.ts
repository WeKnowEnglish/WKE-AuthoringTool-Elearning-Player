import { classifySecondaryClozeTier, clozeClauseScoreForItem } from "@/lib/secondary/secondary-cloze-coverage";
import { buildClozeDistractorPool } from "@/lib/secondary/secondary-cloze-distractors";
import {
  buildClozeParagraphFromItems,
  buildClozeTitle,
} from "@/lib/secondary/secondary-cloze-paragraph";
import { compileClozePickWithTopicRotation } from "@/lib/secondary/secondary-cloze-topic-fill";
import { topicTitleForId } from "@/lib/secondary/secondary-cloze-topic-meta";
import { filterWordItemIdsForSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import type { SecondaryClozeTemplate, SecondaryVocabItem } from "@/lib/secondary/types";

export const SECONDARY_CLOZE_TARGET_BLANKS = 5;
export const SECONDARY_CLOZE_MIN_BLANKS = 2;
export const SECONDARY_CLOZE_MAX_BLANKS = 5;
export const SECONDARY_CLOZE_COMPILER_VERSION = 3 as const;

function buildEligiblePool(wordItemIds: string[], minBlanks: number): SecondaryVocabItem[] {
  const eligibleIds = filterWordItemIdsForSecondaryActivity(wordItemIds, "cloze");
  const ranked = eligibleIds
    .map((wordItemId) => getSecondaryVocabItemById(wordItemId))
    .filter((item): item is SecondaryVocabItem => Boolean(item))
    .filter((item) => clozeClauseScoreForItem(item) > 0)
    .sort((a, b) => {
      const scoreDiff = clozeClauseScoreForItem(b) - clozeClauseScoreForItem(a);
      if (scoreDiff !== 0) return scoreDiff;
      return a.wordItemId.localeCompare(b.wordItemId);
    });

  const tierA = ranked.filter((item) => classifySecondaryClozeTier(item) === "A");
  if (tierA.length >= minBlanks) return tierA;
  return ranked;
}

function buildDistractorSessionPool(
  sessionPool: SecondaryVocabItem[],
  picked: SecondaryVocabItem[],
): SecondaryVocabItem[] {
  const byId = new Map(sessionPool.map((item) => [item.wordItemId, item]));
  for (const item of picked) {
    if (!byId.has(item.wordItemId)) {
      byId.set(item.wordItemId, item);
    }
  }
  return [...byId.values()];
}

export function compileSecondaryClozeFromWordIds(input: {
  wordItemIds: string[];
  masteryRecords?: Record<string, StudentMasteryRecord>;
  studentId?: string;
  dateKey?: string;
  replayIndex?: number;
  targetBlanks?: number;
  minBlanks?: number;
  maxBlanks?: number;
}): SecondaryClozeTemplate | null {
  const targetBlanks = input.targetBlanks ?? SECONDARY_CLOZE_TARGET_BLANKS;
  const minBlanks = input.minBlanks ?? SECONDARY_CLOZE_MIN_BLANKS;
  const maxBlanks = input.maxBlanks ?? SECONDARY_CLOZE_MAX_BLANKS;
  const replayIndex = input.replayIndex ?? 0;
  const masteryRecords = input.masteryRecords ?? {};

  const pool = buildEligiblePool(input.wordItemIds, minBlanks);
  if (pool.length < minBlanks) return null;

  const seed = `${input.studentId ?? "secondary"}:${input.dateKey ?? "daily"}:cloze:r${replayIndex}`;
  const topicPick = compileClozePickWithTopicRotation({
    sessionPool: pool,
    sessionWordItemIds: input.wordItemIds,
    masteryRecords,
    seed,
    replayIndex,
    targetBlanks,
    minBlanks,
    maxBlanks,
  });
  if (!topicPick) return null;

  const { picked, fillerBlankIds, primaryTopicId } = topicPick;
  const title = buildClozeTitle(primaryTopicId, false);
  const distractorSessionPool = buildDistractorSessionPool(pool, picked);

  return {
    id: `cloze-daily-v3-${input.dateKey ?? "session"}-r${replayIndex}`,
    title,
    paragraph: buildClozeParagraphFromItems(picked),
    blankWordItemIds: picked.map((item) => item.wordItemId),
    fillerWordItemIds: fillerBlankIds.length > 0 ? fillerBlankIds : undefined,
    distractorWords: buildClozeDistractorPool({
      picked,
      sessionPool: distractorSessionPool,
    }),
    compilerVersion: SECONDARY_CLOZE_COMPILER_VERSION,
    topicId: primaryTopicId,
    topicTitle: topicTitleForId(primaryTopicId),
    replayIndex,
  };
}
