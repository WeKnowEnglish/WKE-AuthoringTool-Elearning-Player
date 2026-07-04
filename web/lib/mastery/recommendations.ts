import { learningTargetKey } from "@/lib/mastery/engine";
import type { MasterySnapshot } from "@/lib/mastery/local-storage";
import type { StudentMasteryRecord } from "@/lib/mastery/types";

export type VocabularyRecommendationReason =
  | "due_review"
  | "fragile"
  | "developing"
  | "low_confidence";

export type VocabularyPracticeRecommendation = {
  wordId: string;
  reason: VocabularyRecommendationReason;
  priority: number;
  masteryScore: number;
  state: StudentMasteryRecord["state"];
  nextReviewAt: string | null;
};

type VocabularyCandidate = {
  id: string;
};

function isDue(record: StudentMasteryRecord, now: Date): boolean {
  if (!record.nextReviewAt) return false;
  const dueAt = new Date(record.nextReviewAt);
  return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() <= now.getTime();
}

function recommendationForRecord(
  wordId: string,
  record: StudentMasteryRecord,
  now: Date,
): VocabularyPracticeRecommendation | null {
  const base = {
    masteryScore: record.masteryScore,
    state: record.state,
    nextReviewAt: record.nextReviewAt,
  };
  if (isDue(record, now)) {
    return { wordId, reason: "due_review", priority: 100 - record.masteryScore, ...base };
  }
  if (record.state === "stuck" || record.state === "needs_review") {
    return { wordId, reason: "fragile", priority: 80 - record.masteryScore, ...base };
  }
  if (record.state === "practicing" || record.state === "developing") {
    return { wordId, reason: "developing", priority: 50 - record.masteryScore, ...base };
  }
  if (record.confidence < 0.35 && record.exposureCount > 0) {
    return { wordId, reason: "low_confidence", priority: 35 - record.confidence, ...base };
  }
  return null;
}

export function recommendVocabularyPracticeWords(input: {
  words: VocabularyCandidate[];
  mastery: MasterySnapshot;
  now?: Date;
  limit?: number;
}): VocabularyPracticeRecommendation[] {
  const now = input.now ?? new Date();
  const limit = Math.max(0, input.limit ?? input.words.length);
  return input.words
    .map((word) => {
      const targetKey = learningTargetKey({ type: "word", key: word.id });
      const record = input.mastery.records[targetKey];
      if (!record) return null;
      return recommendationForRecord(word.id, record, now);
    })
    .filter((rec): rec is VocabularyPracticeRecommendation => rec != null)
    .sort((a, b) => b.priority - a.priority || a.wordId.localeCompare(b.wordId))
    .slice(0, limit);
}

export function recommendedVocabularyWordIds(input: {
  words: VocabularyCandidate[];
  mastery: MasterySnapshot;
  now?: Date;
  limit?: number;
}): string[] {
  return recommendVocabularyPracticeWords(input).map((rec) => rec.wordId);
}

export function vocabularyRecommendationReasonLabel(
  reason: VocabularyRecommendationReason,
): string {
  switch (reason) {
    case "due_review":
      return "due review";
    case "fragile":
      return "fragile";
    case "developing":
      return "developing";
    case "low_confidence":
      return "low confidence";
  }
}
