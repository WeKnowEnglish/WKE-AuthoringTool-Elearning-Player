import { readMasterySnapshot } from "@/lib/mastery/local-storage";
import {
  recommendVocabularyPracticeWords,
  vocabularyRecommendationReasonLabel,
  type VocabularyRecommendationReason,
} from "@/lib/mastery/recommendations";
import { listVocabSetsInMenuOrder } from "@/lib/primary/vocab-continue";
import { getVocabularySet, type VocabSetId } from "@/lib/vocabulary-templates";

export type PrimaryReviewItem = {
  wordId: string;
  lemma: string;
  imageUrl: string;
  setId: VocabSetId;
  setTitle: string;
  reason: VocabularyRecommendationReason;
  reasonLabel: string;
  priority: number;
};

export type PrimaryReviewModel = {
  items: PrimaryReviewItem[];
  dueCount: number;
  fragileCount: number;
};

/** Aggregate review-worthy words across unlocked curriculum sets. */
export function buildPrimaryReviewModel(limit = 24): PrimaryReviewModel {
  const mastery = readMasterySnapshot();
  const byWord = new Map<string, PrimaryReviewItem>();

  for (const setId of listVocabSetsInMenuOrder()) {
    const def = getVocabularySet(setId);
    const recs = recommendVocabularyPracticeWords({
      words: def.words,
      mastery,
      limit: def.words.length,
    });
    for (const rec of recs) {
      const word = def.words.find((w) => w.id === rec.wordId);
      if (!word) continue;
      const existing = byWord.get(rec.wordId);
      if (existing && existing.priority >= rec.priority) continue;
      byWord.set(rec.wordId, {
        wordId: rec.wordId,
        lemma: word.lemma,
        imageUrl: word.imageUrl,
        setId,
        setTitle: def.title,
        reason: rec.reason,
        reasonLabel: vocabularyRecommendationReasonLabel(rec.reason),
        priority: rec.priority,
      });
    }
  }

  const items = [...byWord.values()]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);

  return {
    items,
    dueCount: items.filter((i) => i.reason === "due_review").length,
    fragileCount: items.filter((i) => i.reason === "fragile").length,
  };
}
