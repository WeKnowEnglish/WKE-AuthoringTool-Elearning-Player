import { describe, expect, it } from "vitest";
import type { SecondarySessionSelectionReason } from "@/lib/secondary/secondary-session-selection";
import {
  applyStretchWordToTodayList,
  countWordsPerTopic,
  enforceTopicSpreadOnTodayList,
  SECONDARY_MAX_WORDS_PER_TOPIC,
} from "@/lib/secondary/secondary-selection-s2";
import { getAllSecondaryVocabItems } from "@/lib/secondary/secondary-vocab-bank";
import { getCompleteSecondaryVocabPack } from "@/lib/secondary/secondary-vocab-pack-loader";

function wordsForTopic(topicId: string, count: number): string[] {
  return getAllSecondaryVocabItems(getCompleteSecondaryVocabPack())
    .filter((item) => item.topicId === topicId)
    .slice(0, count)
    .map((item) => item.wordItemId);
}

function highDifficultyWord(exclude: Set<string>, minDifficulty = 3): string | undefined {
  return getAllSecondaryVocabItems(getCompleteSecondaryVocabPack()).find(
    (item) => !exclude.has(item.wordItemId) && item.difficulty >= minDifficulty,
  )?.wordItemId;
}

function lowDifficultyWord(exclude: Set<string>, maxDifficulty = 2): string | undefined {
  return getAllSecondaryVocabItems(getCompleteSecondaryVocabPack()).find(
    (item) => !exclude.has(item.wordItemId) && item.difficulty <= maxDifficulty,
  )?.wordItemId;
}

describe("secondary-selection-s2", () => {
  it("caps words per topic on today's list", () => {
    const topicId = getCompleteSecondaryVocabPack().topics[0]?.topicId;
    expect(topicId).toBeTruthy();

    const overloaded = wordsForTopic(topicId!, SECONDARY_MAX_WORDS_PER_TOPIC + 2);
    const replacementPool = getAllSecondaryVocabItems(getCompleteSecondaryVocabPack())
      .filter((item) => item.topicId !== topicId)
      .slice(0, 12)
      .map((item) => item.wordItemId);

    const todayWordItemIds = [...overloaded];
    const picked = new Set(todayWordItemIds);
    const reasons: Record<string, SecondarySessionSelectionReason> = Object.fromEntries(
      todayWordItemIds.map((id) => [id, "new" as const]),
    );

    enforceTopicSpreadOnTodayList({
      todayWordItemIds,
      replacementPoolWordItemIds: replacementPool,
      picked,
      reasons,
    });

    const counts = countWordsPerTopic(todayWordItemIds);
    expect(counts.get(topicId!) ?? 0).toBeLessThanOrEqual(SECONDARY_MAX_WORDS_PER_TOPIC);
    expect(todayWordItemIds.length).toBe(overloaded.length);
  });

  it("adds one stretch word by replacing a refresh slot", () => {
    const stretchWord = highDifficultyWord(new Set());
    const refreshWord = lowDifficultyWord(new Set(stretchWord ? [stretchWord] : []));
    expect(stretchWord).toBeTruthy();
    expect(refreshWord).toBeTruthy();

    const todayWordItemIds = [refreshWord, "due-1", "due-2", "new-1", "new-2"];
    const picked = new Set(todayWordItemIds);
    const reasons: Record<string, SecondarySessionSelectionReason> = {
      [refreshWord]: "refresh",
      "due-1": "due_review",
      "due-2": "due_review",
      "new-1": "new",
      "new-2": "new",
    };

    applyStretchWordToTodayList({
      todayWordItemIds,
      stretchCandidateWordItemIds: [stretchWord!],
      picked,
      reasons,
    });

    expect(todayWordItemIds).toContain(stretchWord);
    expect(reasons[stretchWord!]).toBe("stretch");
    expect(todayWordItemIds).not.toContain(refreshWord);
    expect(reasons[refreshWord]).toBeUndefined();
  });
});
