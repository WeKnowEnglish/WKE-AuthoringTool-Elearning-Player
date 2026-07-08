import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import type { SecondaryTodayActivityKey, SecondaryVocabItem } from "@/lib/secondary/types";

export type CanonicalPracticeType =
  | "matching"
  | "meaning_choice"
  | "word_choice"
  | "fill_blank"
  | "spelling"
  | "sentence_builder"
  | "cloze_paragraph"
  | "listening"
  | "speaking"
  | "writing";

const CANONICAL_SET = new Set<string>([
  "matching",
  "meaning_choice",
  "word_choice",
  "fill_blank",
  "spelling",
  "sentence_builder",
  "cloze_paragraph",
  "listening",
  "speaking",
  "writing",
]);

const ALIAS_TO_CANONICAL: Record<string, CanonicalPracticeType> = {
  matching: "matching",
  match: "matching",
  meaningChoice: "meaning_choice",
  meaning_choice: "meaning_choice",
  word_choice: "word_choice",
  wordChoice: "word_choice",
  fillBlank: "fill_blank",
  fill_blank: "fill_blank",
  spelling: "spelling",
  sentence_builder: "sentence_builder",
  sentenceBuilder: "sentence_builder",
  cloze_paragraph: "cloze_paragraph",
  cloze: "cloze_paragraph",
  listening: "listening",
  speaking: "speaking",
  writing: "writing",
};

/** Practice types that satisfy each secondary activity (any one match is enough). */
const ACTIVITY_PRACTICE_TYPES: Record<SecondaryTodayActivityKey, CanonicalPracticeType[]> = {
  match: ["matching", "meaning_choice"],
  cloze: ["cloze_paragraph", "fill_blank"],
  spelling: ["spelling"],
};

export function normalizeSecondaryPracticeType(raw: string): CanonicalPracticeType | null {
  const key = raw.trim();
  if (!key) return null;
  if (ALIAS_TO_CANONICAL[key]) return ALIAS_TO_CANONICAL[key];
  if (CANONICAL_SET.has(key)) return key as CanonicalPracticeType;
  return null;
}

export function normalizeSecondaryPracticeTypes(list: string[]): CanonicalPracticeType[] {
  const out: CanonicalPracticeType[] = [];
  const seen = new Set<CanonicalPracticeType>();
  for (const entry of list) {
    const normalized = normalizeSecondaryPracticeType(entry);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function getRequiredPracticeTypesForActivity(
  activity: SecondaryTodayActivityKey,
): CanonicalPracticeType[] {
  return ACTIVITY_PRACTICE_TYPES[activity];
}

export function wordItemSupportsSecondaryActivity(
  item: SecondaryVocabItem,
  activity: SecondaryTodayActivityKey,
): boolean {
  const required = getRequiredPracticeTypesForActivity(activity);
  const normalized = normalizeSecondaryPracticeTypes(item.practiceTypes);
  return required.some((type) => normalized.includes(type));
}

export function filterWordItemIdsForSecondaryActivity(
  wordItemIds: string[],
  activity: SecondaryTodayActivityKey,
): string[] {
  return wordItemIds.filter((wordItemId) => {
    const item = getSecondaryVocabItemById(wordItemId);
    return item ? wordItemSupportsSecondaryActivity(item, activity) : false;
  });
}

export function countSecondaryActivityEligibleWords(
  wordItemIds: string[],
  activity: SecondaryTodayActivityKey,
): number {
  return filterWordItemIdsForSecondaryActivity(wordItemIds, activity).length;
}
