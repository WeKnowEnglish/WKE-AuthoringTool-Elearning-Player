import { describe, expect, it } from "vitest";
import { learningTargetKey } from "@/lib/mastery/engine";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import {
  buildMasteredFillerPoolForTopic,
  compileClozePickWithTopicRotation,
  fillClozeBlanksForTopic,
  rankSessionTopicsByCount,
} from "@/lib/secondary/secondary-cloze-topic-fill";
import {
  getAllSecondaryVocabItems,
  getSecondaryVocabItemById,
} from "@/lib/secondary/secondary-vocab-bank";
import { getCompleteSecondaryVocabPack } from "@/lib/secondary/secondary-vocab-pack-loader";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function idsForTopic(topicId: string, count: number): string[] {
  return getAllSecondaryVocabItems(getCompleteSecondaryVocabPack())
    .filter((item) => item.topicId === topicId)
    .slice(0, count)
    .map((item) => item.wordItemId);
}

function masteredRecord(wordItemId: string): StudentMasteryRecord {
  return {
    studentId: "student-a",
    targetKey: learningTargetKey({ type: "word", key: wordItemId }),
    targetType: "word",
    targetLabel: wordItemId,
    state: "secure",
    masteryScore: 0.9,
    confidence: 0.85,
    exposureCount: 5,
    retrievalSuccessCount: 4,
    retrievalFailureCount: 1,
    firstTrySuccessCount: 3,
    lastSeenAt: "2026-07-10T00:00:00.000Z",
    lastSuccessAt: "2026-07-10T00:00:00.000Z",
    nextReviewAt: "2026-07-20T00:00:00.000Z",
    commonErrorCodes: [],
    scaffoldingNeeded: "low",
    updatedAt: "2026-07-10T00:00:00.000Z",
  };
}

function sessionPoolFromIds(wordItemIds: string[]): SecondaryVocabItem[] {
  return wordItemIds
    .map((wordItemId) => getSecondaryVocabItemById(wordItemId))
    .filter((item): item is SecondaryVocabItem => Boolean(item));
}

describe("secondary-cloze-topic-fill", () => {
  it("ranks topics by session word count", () => {
    const topicA = getCompleteSecondaryVocabPack().topics[0]!.topicId;
    const topicB = getCompleteSecondaryVocabPack().topics[1]!.topicId;
    const pool = sessionPoolFromIds([
      ...idsForTopic(topicA, 3),
      ...idsForTopic(topicB, 1),
    ]);

    expect(rankSessionTopicsByCount(pool)).toEqual([topicA, topicB]);
  });

  it("pads to five blanks with mastered off-list words from the same topic", () => {
    const topicId = getCompleteSecondaryVocabPack().topics[0]!.topicId;
    const sessionIds = idsForTopic(topicId, 2);
    const sessionPool = sessionPoolFromIds(sessionIds);
    const sessionWordItemIds = new Set(sessionIds);

    const offListMastered = idsForTopic(topicId, 8).filter((id) => !sessionWordItemIds.has(id));
    const masteryRecords = Object.fromEntries(
      offListMastered.map((wordItemId) => [
        learningTargetKey({ type: "word", key: wordItemId }),
        masteredRecord(wordItemId),
      ]),
    );

    const result = fillClozeBlanksForTopic({
      topicId,
      sessionPool,
      sessionWordItemIds,
      masteryRecords,
      seed: "seed",
      targetBlanks: 5,
      minBlanks: 2,
      maxBlanks: 5,
    });

    expect(result).not.toBeNull();
    expect(result!.picked).toHaveLength(5);
    expect(result!.sessionBlankIds).toHaveLength(2);
    expect(result!.fillerBlankIds).toHaveLength(3);
    expect(result!.picked.every((item) => item.topicId === topicId)).toBe(true);
    for (const fillerId of result!.fillerBlankIds) {
      expect(sessionWordItemIds.has(fillerId)).toBe(false);
    }
  });

  it("falls back to two blanks when fillers are unavailable", () => {
    const topicId = getCompleteSecondaryVocabPack().topics[0]!.topicId;
    const sessionIds = idsForTopic(topicId, 2);
    const sessionPool = sessionPoolFromIds(sessionIds);

    const result = fillClozeBlanksForTopic({
      topicId,
      sessionPool,
      sessionWordItemIds: new Set(sessionIds),
      masteryRecords: {},
      seed: "seed",
      targetBlanks: 5,
      minBlanks: 2,
      maxBlanks: 5,
    });

    expect(result).not.toBeNull();
    expect(result!.picked).toHaveLength(2);
    expect(result!.fillerBlankIds).toHaveLength(0);
  });

  it("excludes non-mastered off-list words from filler pool", () => {
    const topicId = getCompleteSecondaryVocabPack().topics[0]!.topicId;
    const offListIds = idsForTopic(topicId, 5).slice(2, 5);
    const fillers = buildMasteredFillerPoolForTopic({
      topicId,
      sessionWordItemIds: new Set(idsForTopic(topicId, 2)),
      masteryRecords: {
        [learningTargetKey({ type: "word", key: offListIds[0]! })]: masteredRecord(offListIds[0]!),
      },
    });

    expect(fillers.map((item) => item.wordItemId)).toEqual([offListIds[0]]);
  });

  it("rotates topic selection by replayIndex", () => {
    const topicA = getCompleteSecondaryVocabPack().topics[0]!.topicId;
    const topicB = getCompleteSecondaryVocabPack().topics[1]!.topicId;
    const sessionIds = [...idsForTopic(topicA, 2), ...idsForTopic(topicB, 2)];
    const sessionPool = sessionPoolFromIds(sessionIds);
    const masteryRecords = Object.fromEntries(
      getAllSecondaryVocabItems(getCompleteSecondaryVocabPack())
        .filter((item) => item.topicId === topicA || item.topicId === topicB)
        .map((item) => [
          learningTargetKey({ type: "word", key: item.wordItemId }),
          masteredRecord(item.wordItemId),
        ]),
    );

    const first = compileClozePickWithTopicRotation({
      sessionPool,
      sessionWordItemIds: sessionIds,
      masteryRecords,
      seed: "student:2026-07-10:cloze:r0",
      replayIndex: 0,
      targetBlanks: 5,
      minBlanks: 2,
      maxBlanks: 5,
    });
    const second = compileClozePickWithTopicRotation({
      sessionPool,
      sessionWordItemIds: sessionIds,
      masteryRecords,
      seed: "student:2026-07-10:cloze:r1",
      replayIndex: 1,
      targetBlanks: 5,
      minBlanks: 2,
      maxBlanks: 5,
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.primaryTopicId).not.toBe(second!.primaryTopicId);
  });
});
