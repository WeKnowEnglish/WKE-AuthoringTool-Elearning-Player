import { describe, expect, it } from "vitest";
import { learningTargetKey } from "@/lib/mastery/engine";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import { filterWordItemIdsForSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import {
  compileSecondaryClozeFromWordIds,
  SECONDARY_CLOZE_COMPILER_VERSION,
  SECONDARY_CLOZE_MAX_BLANKS,
  SECONDARY_CLOZE_MIN_BLANKS,
  SECONDARY_CLOZE_TARGET_BLANKS,
} from "@/lib/secondary/secondary-cloze-compiler";
import {
  getAllSecondaryVocabItems,
  getAllSecondaryWordItemIds,
  getSecondaryTopicTitle,
  getSecondaryVocabItemById,
} from "@/lib/secondary/secondary-vocab-bank";
import { getCompleteSecondaryVocabPack } from "@/lib/secondary/secondary-vocab-pack-loader";

function clozeEligibleIdsFromPack(wordItemIds: string[]): string[] {
  return filterWordItemIdsForSecondaryActivity(wordItemIds, "cloze").filter((wordItemId) => {
    const item = getSecondaryVocabItemById(wordItemId);
    return Boolean(item?.exampleSentence?.trim() || item?.sentenceFrame?.includes("___"));
  });
}

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

function masteryRecordsForTopic(topicId: string, excludeIds: string[] = []): Record<string, StudentMasteryRecord> {
  const exclude = new Set(excludeIds);
  const records: Record<string, StudentMasteryRecord> = {};

  for (const item of getAllSecondaryVocabItems(getCompleteSecondaryVocabPack())) {
    if (item.topicId !== topicId || exclude.has(item.wordItemId)) continue;
    const targetKey = learningTargetKey({ type: "word", key: item.wordItemId });
    records[targetKey] = masteredRecord(item.wordItemId);
  }

  return records;
}

describe("secondary-cloze-compiler", () => {
  it("returns null when fewer than two cloze-eligible words are available", () => {
    expect(
      compileSecondaryClozeFromWordIds({
        wordItemIds: ["missing-1", "missing-2"],
        studentId: "student-a",
        dateKey: "2026-07-04",
      }),
    ).toBeNull();
  });

  it("builds a topic-titled daily paragraph from today's cloze-eligible words", () => {
    const topicId = getCompleteSecondaryVocabPack().topics[0]!.topicId;
    const eligible = idsForTopic(topicId, 8);

    const compiled = compileSecondaryClozeFromWordIds({
      wordItemIds: eligible,
      masteryRecords: masteryRecordsForTopic(topicId, eligible),
      studentId: "student-a",
      dateKey: "2026-07-04",
    });

    expect(compiled).not.toBeNull();
    expect(compiled!.compilerVersion).toBe(SECONDARY_CLOZE_COMPILER_VERSION);
    expect(compiled!.id).toContain("cloze-daily-v3-");
    expect(compiled!.blankWordItemIds.length).toBe(SECONDARY_CLOZE_TARGET_BLANKS);
    expect(compiled!.paragraph).toContain("____");
    expect(compiled!.title).toBe(`${getSecondaryTopicTitle(topicId)} Cloze`);
    expect(compiled!.topicId).toBe(topicId);
    expect(compiled!.topicTitle).toBe(getSecondaryTopicTitle(topicId));
    for (const wordItemId of compiled!.blankWordItemIds) {
      expect(getSecondaryVocabItemById(wordItemId)?.topicId).toBe(topicId);
    }
  });

  it("is deterministic for the same student, date, word set, and replay index", () => {
    const packIds = getAllSecondaryWordItemIds(getCompleteSecondaryVocabPack());
    const eligible = clozeEligibleIdsFromPack(packIds).slice(0, 20);
    const input = {
      wordItemIds: eligible,
      studentId: "student-a",
      dateKey: "2026-07-04",
      replayIndex: 0,
    };

    const first = compileSecondaryClozeFromWordIds(input);
    const second = compileSecondaryClozeFromWordIds(input);
    expect(second).toEqual(first);
  });

  it("uses sentence frames when available", () => {
    const framed = getAllSecondaryVocabItems(getCompleteSecondaryVocabPack()).find((item) =>
      item.sentenceFrame?.includes("___"),
    );
    if (!framed) return;

    const topicId = framed.topicId;
    const compiled = compileSecondaryClozeFromWordIds({
      wordItemIds: [framed.wordItemId, ...clozeEligibleIdsFromPack(getAllSecondaryWordItemIds()).slice(0, 4)],
      masteryRecords: masteryRecordsForTopic(topicId),
      studentId: "student-a",
      dateKey: "2026-07-04",
      minBlanks: 2,
      maxBlanks: 5,
    });

    expect(compiled?.blankWordItemIds).toContain(framed.wordItemId);
  });

  it("pads scattered session words to five blanks with mastered fillers", () => {
    const topicId = getCompleteSecondaryVocabPack().topics[0]!.topicId;
    const sessionIds = idsForTopic(topicId, 2);

    const compiled = compileSecondaryClozeFromWordIds({
      wordItemIds: sessionIds,
      masteryRecords: masteryRecordsForTopic(topicId, sessionIds),
      studentId: "student-a",
      dateKey: "2026-07-04",
    });

    expect(compiled).not.toBeNull();
    expect(compiled!.blankWordItemIds.length).toBe(SECONDARY_CLOZE_TARGET_BLANKS);
    expect(compiled!.fillerWordItemIds?.length).toBe(3);
    expect(compiled!.blankWordItemIds.filter((id) => sessionIds.includes(id))).toHaveLength(2);
  });

  it("falls back to two blanks when no mastered fillers are available", () => {
    const topicId = getCompleteSecondaryVocabPack().topics[0]!.topicId;
    const sessionIds = idsForTopic(topicId, 2);

    const compiled = compileSecondaryClozeFromWordIds({
      wordItemIds: sessionIds,
      studentId: "student-a",
      dateKey: "2026-07-04",
    });

    expect(compiled).not.toBeNull();
    expect(compiled!.blankWordItemIds.length).toBe(SECONDARY_CLOZE_MIN_BLANKS);
    expect(compiled!.blankWordItemIds.length).toBeLessThanOrEqual(SECONDARY_CLOZE_MAX_BLANKS);
  });

  it("changes topic on replay index", () => {
    const topicA = getCompleteSecondaryVocabPack().topics[0]!.topicId;
    const topicB = getCompleteSecondaryVocabPack().topics[1]!.topicId;
    const sessionIds = [...idsForTopic(topicA, 2), ...idsForTopic(topicB, 2)];
    const masteryRecords = {
      ...masteryRecordsForTopic(topicA, sessionIds),
      ...masteryRecordsForTopic(topicB, sessionIds),
    };

    const first = compileSecondaryClozeFromWordIds({
      wordItemIds: sessionIds,
      masteryRecords,
      studentId: "student-a",
      dateKey: "2026-07-04",
      replayIndex: 0,
    });
    const second = compileSecondaryClozeFromWordIds({
      wordItemIds: sessionIds,
      masteryRecords,
      studentId: "student-a",
      dateKey: "2026-07-04",
      replayIndex: 1,
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.topicId).not.toBe(second!.topicId);
  });
});
