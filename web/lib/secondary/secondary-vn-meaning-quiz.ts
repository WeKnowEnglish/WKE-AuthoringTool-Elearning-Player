import {
  getAllSecondaryVocabItems,
  getSecondaryVocabItemsByIds,
} from "@/lib/secondary/secondary-vocab-bank";
import type { SecondaryVocabItem } from "@/lib/secondary/types";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

export type SecondaryVnMeaningChoice = {
  id: string;
  label: string;
  isCorrect: boolean;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalizeKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function getTopicPeerItems(item: SecondaryVocabItem): SecondaryVocabItem[] {
  return getAllSecondaryVocabItems().filter(
    (entry) => entry.topicId === item.topicId && entry.wordItemId !== item.wordItemId,
  );
}

function resolveVnMeaningDistractors(
  item: SecondaryVocabItem,
  sessionItems: SecondaryVocabItem[],
): string[] {
  const correct = normalizeKey(item.vnMeaning);
  const pool: string[] = [];

  for (const entry of sessionItems) {
    if (entry.wordItemId !== item.wordItemId && entry.vnMeaning?.trim()) {
      pool.push(entry.vnMeaning.trim());
    }
  }

  if (sessionItems.length === 0) {
    for (const peer of getTopicPeerItems(item)) {
      if (peer.vnMeaning?.trim()) pool.push(peer.vnMeaning.trim());
    }
  }

  return uniqueStrings(pool).filter((meaning) => normalizeKey(meaning) !== correct);
}

export function compileSecondaryVnMeaningQuiz(input: {
  item: SecondaryVocabItem;
  sessionWordItemIds?: string[];
  studentId?: string;
  dateKey?: string;
  runSeed?: string;
}): SecondaryVnMeaningChoice[] | null {
  const correctLabel = input.item.vnMeaning?.trim();
  if (!correctLabel) return null;

  const sessionItems = getSecondaryVocabItemsByIds(
    (input.sessionWordItemIds ?? []).filter((id) => id !== input.item.wordItemId),
  );
  const seed = `${input.studentId ?? "secondary"}:${input.dateKey ?? "local"}:vn:${input.item.wordItemId}:${input.runSeed ?? "0"}`;

  const wrongLabels = shuffleWithSeed(
    resolveVnMeaningDistractors(input.item, sessionItems),
    `${seed}:wrong`,
  ).slice(0, 3);

  if (wrongLabels.length < 2) return null;

  return shuffleWithSeed(
    [
      { id: "correct", label: correctLabel, isCorrect: true },
      ...wrongLabels.map((label, index) => ({
        id: `wrong-${index}`,
        label,
        isCorrect: false,
      })),
    ],
    `${seed}:choices`,
  );
}

/** Maps wrong-attempt count before success to mastery evidence (attempt 3 still earns a little). */
export function secondaryVnMeaningQuizEvidenceMeta(wrongAttemptsBeforeSuccess: number): {
  firstTry: boolean;
  attempts: number;
} {
  const attempts = wrongAttemptsBeforeSuccess + 1;
  return {
    firstTry: wrongAttemptsBeforeSuccess === 0,
    attempts,
  };
}
