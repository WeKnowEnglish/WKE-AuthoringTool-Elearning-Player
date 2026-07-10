import { buildSecondaryLearnClozePreview } from "@/lib/secondary/secondary-learn-content";
import {
  getAllSecondaryVocabItems,
  getSecondaryVocabItemById,
  getSecondaryVocabItemsByIds,
  resolveWordItemIdFromLegacyWord,
} from "@/lib/secondary/secondary-vocab-bank";
import type { SecondaryVocabItem } from "@/lib/secondary/types";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

export type SecondaryLearnQuestionKind =
  | "meaning_mc"
  | "cloze_mc"
  | "spelling_mc"
  | "word_for_meaning_mc";

export type SecondaryLearnChoice = {
  id: string;
  label: string;
  isCorrect: boolean;
};

export type SecondaryLearnQuestion = {
  id: string;
  kind: SecondaryLearnQuestionKind;
  prompt: string;
  choices: SecondaryLearnChoice[];
};

export const SECONDARY_LEARN_TARGET_QUESTIONS = 3;
export const SECONDARY_LEARN_MIN_QUESTIONS = 2;

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

function resolveDistractorWords(item: SecondaryVocabItem, sessionItems: SecondaryVocabItem[]): string[] {
  const correct = normalizeKey(item.word);
  const fromItem = (item.distractors ?? []).map((word) => word.trim()).filter(Boolean);
  const fromSession = sessionItems.map((entry) => entry.word).filter(Boolean);
  const fromTopic = sessionItems.length > 0 ? [] : getTopicPeerItems(item).map((entry) => entry.word);

  return uniqueStrings([...fromItem, ...fromSession, ...fromTopic]).filter(
    (word) => normalizeKey(word) !== correct,
  );
}

function meaningForDistractorWord(
  word: string,
  sessionItems: SecondaryVocabItem[],
): string | undefined {
  const sessionMatch = sessionItems.find(
    (entry) => normalizeKey(entry.word) === normalizeKey(word),
  );
  if (sessionMatch) return sessionMatch.studentMeaningEn;

  const wordItemId = resolveWordItemIdFromLegacyWord(word);
  if (!wordItemId) return undefined;
  return getSecondaryVocabItemById(wordItemId)?.studentMeaningEn;
}

function resolveMeaningDistractors(item: SecondaryVocabItem, sessionItems: SecondaryVocabItem[]): string[] {
  const correct = normalizeKey(item.studentMeaningEn);
  const pool: string[] = [];

  for (const word of item.distractors ?? []) {
    const meaning = meaningForDistractorWord(word, sessionItems);
    if (meaning) pool.push(meaning);
  }

  for (const entry of sessionItems) {
    if (entry.wordItemId !== item.wordItemId) {
      pool.push(entry.studentMeaningEn);
    }
  }

  if (sessionItems.length === 0) {
    for (const peer of getTopicPeerItems(item)) {
      pool.push(peer.studentMeaningEn);
    }
  }

  return uniqueStrings(pool).filter((meaning) => normalizeKey(meaning) !== correct);
}

function buildMeaningQuestion(
  item: SecondaryVocabItem,
  sessionItems: SecondaryVocabItem[],
  seed: string,
): SecondaryLearnQuestion {
  const wrongMeanings = shuffleWithSeed(
    resolveMeaningDistractors(item, sessionItems),
    `${seed}:meaning-wrong`,
  ).slice(0, 2);

  const choices = shuffleWithSeed(
    [
      { id: "correct", label: item.studentMeaningEn, isCorrect: true },
      ...wrongMeanings.map((label, index) => ({
        id: `wrong-${index}`,
        label,
        isCorrect: false,
      })),
    ],
    `${seed}:meaning-choices`,
  );

  return {
    id: `${item.wordItemId}:meaning`,
    kind: "meaning_mc",
    prompt: `What does ${item.word} mean?`,
    choices,
  };
}

function buildClozeQuestion(
  item: SecondaryVocabItem,
  sessionItems: SecondaryVocabItem[],
  seed: string,
): SecondaryLearnQuestion | null {
  const preview = buildSecondaryLearnClozePreview(item);
  if (!preview) return null;

  const wrongWords = shuffleWithSeed(
    resolveDistractorWords(item, sessionItems),
    `${seed}:cloze-wrong`,
  ).slice(0, 3);

  const choices = shuffleWithSeed(
    [
      { id: "correct", label: item.word, isCorrect: true },
      ...wrongWords.map((label, index) => ({
        id: `wrong-${index}`,
        label,
        isCorrect: false,
      })),
    ],
    `${seed}:cloze-choices`,
  );

  return {
    id: `${item.wordItemId}:cloze`,
    kind: "cloze_mc",
    prompt: preview,
    choices,
  };
}

function buildSpellingQuestion(
  item: SecondaryVocabItem,
  sessionItems: SecondaryVocabItem[],
  seed: string,
): SecondaryLearnQuestion | null {
  const mistakes = uniqueStrings(item.spellingSupport?.commonMistakes ?? []);
  const wrongSpellings = shuffleWithSeed(
    [...mistakes, ...resolveDistractorWords(item, sessionItems)],
    `${seed}:spelling-wrong`,
  )
    .filter((word) => normalizeKey(word) !== normalizeKey(item.word))
    .slice(0, 2);

  if (wrongSpellings.length === 0) return null;

  const choices = shuffleWithSeed(
    [
      { id: "correct", label: item.word, isCorrect: true },
      ...wrongSpellings.map((label, index) => ({
        id: `wrong-${index}`,
        label,
        isCorrect: false,
      })),
    ],
    `${seed}:spelling-choices`,
  );

  return {
    id: `${item.wordItemId}:spelling`,
    kind: "spelling_mc",
    prompt: "Which spelling is correct?",
    choices,
  };
}

function buildWordForMeaningQuestion(
  item: SecondaryVocabItem,
  sessionItems: SecondaryVocabItem[],
  seed: string,
  suffix: string,
): SecondaryLearnQuestion {
  const wrongWords = shuffleWithSeed(
    resolveDistractorWords(item, sessionItems),
    `${seed}:word-wrong:${suffix}`,
  ).slice(0, 2);

  const choices = shuffleWithSeed(
    [
      { id: "correct", label: item.word, isCorrect: true },
      ...wrongWords.map((label, index) => ({
        id: `wrong-${index}`,
        label,
        isCorrect: false,
      })),
    ],
    `${seed}:word-choices:${suffix}`,
  );

  return {
    id: `${item.wordItemId}:word-for-meaning:${suffix}`,
    kind: "word_for_meaning_mc",
    prompt: `Which word matches this meaning?\n${item.studentMeaningEn}`,
    choices,
  };
}

export function compileSecondaryLearnQuestions(input: {
  item: SecondaryVocabItem;
  sessionWordItemIds?: string[];
  studentId?: string;
  dateKey: string;
  runSeed?: string;
}): SecondaryLearnQuestion[] {
  const sessionItems = getSecondaryVocabItemsByIds(
    (input.sessionWordItemIds ?? []).filter((id) => id !== input.item.wordItemId),
  );
  const baseSeed = `${input.studentId ?? "secondary"}:${input.dateKey}:learn:${input.item.wordItemId}:${input.runSeed ?? "0"}`;

  const candidates: SecondaryLearnQuestion[] = [];
  candidates.push(buildMeaningQuestion(input.item, sessionItems, baseSeed));

  const cloze = buildClozeQuestion(input.item, sessionItems, baseSeed);
  if (cloze) candidates.push(cloze);

  const spelling = buildSpellingQuestion(input.item, sessionItems, baseSeed);
  if (spelling) candidates.push(spelling);

  let backfillIndex = 0;
  while (candidates.length < SECONDARY_LEARN_TARGET_QUESTIONS && backfillIndex < 4) {
    candidates.push(
      buildWordForMeaningQuestion(input.item, sessionItems, baseSeed, String(backfillIndex)),
    );
    backfillIndex += 1;
  }

  const deduped: SecondaryLearnQuestion[] = [];
  const seenKinds = new Set<SecondaryLearnQuestionKind>();
  for (const question of candidates) {
    if (question.kind !== "word_for_meaning_mc" && seenKinds.has(question.kind)) continue;
    if (question.kind !== "word_for_meaning_mc") seenKinds.add(question.kind);
    deduped.push(question);
    if (deduped.length >= SECONDARY_LEARN_TARGET_QUESTIONS) break;
  }

  if (deduped.length < SECONDARY_LEARN_MIN_QUESTIONS) {
    return deduped.length > 0 ? deduped : [candidates[0]!];
  }

  return deduped.slice(0, SECONDARY_LEARN_TARGET_QUESTIONS);
}
