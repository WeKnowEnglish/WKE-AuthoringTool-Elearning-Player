import type { VocabWord } from "./types";

export const VOCAB_SPELL_GROUP_ID = "vocab-spell";
export const VOCAB_SPELL_GROUP_TITLE = "Spell the word";
export const VOCAB_SPELL_IMMERSIVE_PROMPT = "Spell the word.";

export function vocabSpellAcceptedWords(word: VocabWord): string[] {
  const lemma = word.lemma;
  const capitalized = lemma.charAt(0).toUpperCase() + lemma.slice(1);
  return lemma === capitalized ? [lemma] : [lemma, capitalized];
}

export function buildVocabLetterMixupPayload(
  word: VocabWord,
  runSeed: string,
  groupOrder: number,
): Record<string, unknown> {
  return {
    auto_advance_on_pass: true as const,
    type: "interaction",
    subtype: "letter_mixup",
    vocab_word_id: word.id,
    letter_shuffle_seed: `${runSeed}:spell-letters:${word.id}`,
    image_url: word.imageUrl,
    image_fit: "contain",
    image_use_tts: true,
    image_read_aloud_text: word.tts ?? word.lemma,
    prompt: VOCAB_SPELL_IMMERSIVE_PROMPT,
    items: [
      {
        id: word.id,
        target_word: word.lemma,
        accepted_words: vocabSpellAcceptedWords(word),
      },
    ],
    shuffle_letters: true,
    quiz_group_id: VOCAB_SPELL_GROUP_ID,
    quiz_group_title: VOCAB_SPELL_GROUP_TITLE,
    quiz_group_order: groupOrder,
  };
}
