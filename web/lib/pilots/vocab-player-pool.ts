import { createHobbiesVocabularyListDocument } from "@/lib/learning-tracks/create-hobbies-vocabulary-list";
import type { VocabListEntry, VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import { getVocabularySet } from "@/lib/vocabulary-templates/registry";
import type { VocabSetId, VocabWord } from "@/lib/vocabulary-templates/types";

const PRIMARY_POOL_SET_IDS: VocabSetId[] = [
  "breakfast_food",
  "food_fruit",
  "food_snacks",
  "school_supplies",
  "pets",
];

function glossFromWord(word: VocabWord): string {
  const template = word.cloze?.[0]?.template?.trim();
  if (template) {
    return template.replace(/__\d+__/g, "___");
  }
  return `Learn the word “${word.lemma}”.`;
}

function exampleFromWord(word: VocabWord): string {
  const template = word.cloze?.[0]?.template?.trim();
  if (template) {
    const answer = word.cloze?.[0]?.acceptable?.[0] ?? word.lemma;
    return template.replace(/__\d+__/g, answer);
  }
  return `I like ${word.lemma}.`;
}

function primaryWordToEntry(word: VocabWord, setId: string): VocabListEntry {
  return {
    id: `${setId}:${word.id}`,
    word: word.lemma,
    definitionEn: glossFromWord(word),
    example: exampleFromWord(word),
    imageUrl: word.imageUrl,
  };
}

/** Large demo pool: hobbies + several Primary A1 sets (images ready). */
export function buildVocabPlayerPoolDocument(): VocabularyListDocument {
  const hobbies = createHobbiesVocabularyListDocument();
  const primaryEntries: VocabListEntry[] = [];
  for (const setId of PRIMARY_POOL_SET_IDS) {
    const set = getVocabularySet(setId);
    if (!set) continue;
    for (const word of set.words) {
      primaryEntries.push(primaryWordToEntry(word, setId));
    }
  }

  // Dedupe by normalized lemma (prefer first occurrence).
  const seen = new Set<string>();
  const entries: VocabListEntry[] = [];
  for (const entry of [...hobbies.entries, ...primaryEntries]) {
    const key = entry.word.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    entries.push(entry);
  }

  return {
    version: 1,
    kind: "vocabulary-list",
    id: "vocab-player-pool",
    name: "Vocabulary player pool",
    cefr: "A1",
    entries,
  };
}

export function vocabPlayerPoolSize(): number {
  return buildVocabPlayerPoolDocument().entries.length;
}
