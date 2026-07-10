import completeCoreVocabPackJson from "@/g7-a2-complete-core-vocab-v1_2.json";
import type {
  SecondaryCefrLevel,
  SecondaryDifficulty,
  SecondaryPartOfSpeech,
  SecondaryVocabItem,
  SecondaryVocabPack,
  SecondaryVocabPackMetadata,
  SecondaryVocabSet,
  SecondaryVocabTopic,
} from "@/lib/secondary/types";

export const SECONDARY_VOCAB_PACK_ID = "g7-a2-complete-core-vocab-v1-2";
export const SECONDARY_VOCAB_PACK_VERSION = "1.2.0";
export const SECONDARY_VOCAB_PACK_ITEM_COUNT = 240;

type RawVocabItem = {
  wordItemId: string;
  packId?: string;
  topicId: string;
  setId: string;
  word: string;
  lemma?: string;
  partOfSpeech: string;
  cefrLevel: string;
  gradeBand: string;
  studentMeaningEn: string;
  vnMeaning: string;
  exampleSentence: string;
  difficulty: number;
  practiceTypes: string[];
  tags?: string[];
  commonChunks?: string[];
  relatedWords?: string[];
  opposites?: string[];
  distractors?: string[];
  sentenceFrame?: string;
  spellingSupport?: {
    syllables?: string[];
    commonMistakes?: string[];
  };
  imageUrl?: string;
  mediaHint?: string;
};

type RawVocabSet = {
  setId: string;
  title: string;
  description?: string;
  practiceFocus?: string[];
  items: RawVocabItem[];
};

type RawVocabTopic = {
  topicId: string;
  title: string;
  description?: string;
  sets: RawVocabSet[];
};

type RawVocabPack = {
  metadata: {
    packId: string;
    title: string;
    description: string;
    cefrLevel: string;
    gradeBand: string;
    version: string;
    itemCount?: number;
  };
  topics: RawVocabTopic[];
};

const PART_OF_SPEECH_MAP: Record<string, SecondaryPartOfSpeech> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  phrase: "phrase",
  "noun phrase": "phrase",
  "phrasal verb": "phrase",
  "verb phrase": "phrase",
  conjunction: "phrase",
  preposition: "phrase",
};

function clampDifficulty(value: number): SecondaryDifficulty {
  const rounded = Math.max(1, Math.min(5, Math.round(value)));
  return rounded as SecondaryDifficulty;
}

function normalizeCefrLevel(value: string): SecondaryCefrLevel {
  const upper = value.trim().toUpperCase();
  if (upper === "A1" || upper === "A2" || upper === "B1") return upper;
  return "A2";
}

export function normalizeSecondaryPartOfSpeech(raw: string): SecondaryPartOfSpeech {
  const key = raw.trim().toLowerCase();
  return PART_OF_SPEECH_MAP[key] ?? "phrase";
}

function normalizeSpellingSupport(
  raw: RawVocabItem["spellingSupport"],
): SecondaryVocabItem["spellingSupport"] | undefined {
  if (!raw) return undefined;

  const syllables = (raw.syllables ?? [])
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const commonMistakes = (raw.commonMistakes ?? [])
    .map((mistake) => mistake.trim())
    .filter((mistake) => mistake.length > 0);

  if (syllables.length === 0 && commonMistakes.length === 0) return undefined;

  return {
    syllables,
    commonMistakes,
  };
}

export function normalizeSecondaryVocabItem(raw: RawVocabItem): SecondaryVocabItem {
  return {
    wordItemId: raw.wordItemId,
    packId: raw.packId ?? SECONDARY_VOCAB_PACK_ID,
    topicId: raw.topicId,
    setId: raw.setId,
    word: raw.word,
    lemma: raw.lemma?.trim() || raw.word,
    partOfSpeech: normalizeSecondaryPartOfSpeech(raw.partOfSpeech),
    cefrLevel: normalizeCefrLevel(raw.cefrLevel),
    gradeBand: raw.gradeBand,
    studentMeaningEn: raw.studentMeaningEn,
    vnMeaning: raw.vnMeaning,
    exampleSentence: raw.exampleSentence,
    difficulty: clampDifficulty(raw.difficulty),
    practiceTypes: [...(raw.practiceTypes ?? [])],
    tags: [...(raw.tags ?? [])],
    commonChunks: raw.commonChunks ? [...raw.commonChunks] : undefined,
    relatedWords: raw.relatedWords ? [...raw.relatedWords] : undefined,
    opposites: raw.opposites ? [...raw.opposites] : undefined,
    distractors: raw.distractors ? [...raw.distractors] : undefined,
    sentenceFrame: raw.sentenceFrame,
    spellingSupport: normalizeSpellingSupport(raw.spellingSupport),
    imageUrl: raw.imageUrl?.trim() || undefined,
    mediaHint: raw.mediaHint?.trim() || undefined,
  };
}

function normalizeMetadata(raw: RawVocabPack["metadata"]): SecondaryVocabPackMetadata {
  return {
    packId: raw.packId,
    title: raw.title,
    description: raw.description,
    cefrLevel: normalizeCefrLevel(raw.cefrLevel),
    gradeBand: raw.gradeBand,
    version: raw.version,
  };
}

export function parseSecondaryVocabPack(raw: RawVocabPack): SecondaryVocabPack {
  const topics: SecondaryVocabTopic[] = raw.topics.map((topic) => ({
    topicId: topic.topicId,
    title: topic.title,
    description: topic.description,
    sets: topic.sets.map((set): SecondaryVocabSet => ({
      setId: set.setId,
      title: set.title,
      description: set.description,
      practiceFocus: [...(set.practiceFocus ?? [])],
      items: set.items.map(normalizeSecondaryVocabItem),
    })),
  }));

  return {
    metadata: normalizeMetadata(raw.metadata),
    topics,
  };
}

export type SecondaryVocabPackValidationIssue = {
  code: string;
  message: string;
  wordItemId?: string;
};

export function collectSecondaryVocabPackValidationIssues(
  pack: SecondaryVocabPack,
): SecondaryVocabPackValidationIssue[] {
  const issues: SecondaryVocabPackValidationIssue[] = [];
  const seenIds = new Set<string>();
  let itemCount = 0;

  if (pack.metadata.packId !== SECONDARY_VOCAB_PACK_ID) {
    issues.push({
      code: "pack_id_mismatch",
      message: `Expected packId ${SECONDARY_VOCAB_PACK_ID}, got ${pack.metadata.packId}`,
    });
  }

  if (pack.metadata.version !== SECONDARY_VOCAB_PACK_VERSION) {
    issues.push({
      code: "pack_version_mismatch",
      message: `Expected version ${SECONDARY_VOCAB_PACK_VERSION}, got ${pack.metadata.version}`,
    });
  }

  for (const topic of pack.topics) {
    for (const set of topic.sets) {
      for (const item of set.items) {
        itemCount += 1;

        if (!item.wordItemId) {
          issues.push({ code: "missing_word_item_id", message: "Item missing wordItemId" });
          continue;
        }

        if (seenIds.has(item.wordItemId)) {
          issues.push({
            code: "duplicate_word_item_id",
            message: `Duplicate wordItemId ${item.wordItemId}`,
            wordItemId: item.wordItemId,
          });
        }
        seenIds.add(item.wordItemId);

        if (!item.word.trim()) {
          issues.push({
            code: "missing_word",
            message: "Item missing word text",
            wordItemId: item.wordItemId,
          });
        }
        if (!item.studentMeaningEn.trim()) {
          issues.push({
            code: "missing_meaning",
            message: "Item missing studentMeaningEn",
            wordItemId: item.wordItemId,
          });
        }
        if (!item.exampleSentence.trim()) {
          issues.push({
            code: "missing_example",
            message: "Item missing exampleSentence",
            wordItemId: item.wordItemId,
          });
        }
        if (item.practiceTypes.length === 0) {
          issues.push({
            code: "missing_practice_types",
            message: "Item missing practiceTypes",
            wordItemId: item.wordItemId,
          });
        }
      }
    }
  }

  if (itemCount !== SECONDARY_VOCAB_PACK_ITEM_COUNT) {
    issues.push({
      code: "item_count_mismatch",
      message: `Expected ${SECONDARY_VOCAB_PACK_ITEM_COUNT} items, got ${itemCount}`,
    });
  }

  return issues;
}

export function validateSecondaryVocabPack(pack: SecondaryVocabPack): void {
  const issues = collectSecondaryVocabPackValidationIssues(pack);
  if (issues.length > 0) {
    const summary = issues
      .slice(0, 5)
      .map((issue) => issue.message)
      .join("; ");
    throw new Error(`Secondary vocab pack validation failed (${issues.length} issues): ${summary}`);
  }
}

let cachedCompletePack: SecondaryVocabPack | null = null;

export function getCompleteSecondaryVocabPack(): SecondaryVocabPack {
  if (!cachedCompletePack) {
    cachedCompletePack = parseSecondaryVocabPack(completeCoreVocabPackJson as RawVocabPack);
    validateSecondaryVocabPack(cachedCompletePack);
  }
  return cachedCompletePack;
}

/** Test-only reset for validation specs. */
export function resetCompleteSecondaryVocabPackCacheForTests(): void {
  cachedCompletePack = null;
}
