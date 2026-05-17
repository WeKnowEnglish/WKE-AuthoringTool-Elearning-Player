import { pickNWithSeed, shuffleWithSeed } from "./shuffle";
import type { VocabWord, VocabWordCloze } from "./types";

export const VOCAB_CLOZE_GROUP_ID = "vocab-cloze";
export const VOCAB_CLOZE_GROUP_TITLE = "Complete the sentence";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One or more cloze variants per vocabulary word. */
export function vocabClozeVariants(word: VocabWord): VocabWordCloze[] {
  return Array.isArray(word.cloze) ? word.cloze : [word.cloze];
}

/** Pick one cloze variant for this run (stable for the same seed). */
export function pickVocabClozeForWord(word: VocabWord, runSeed: string): VocabWordCloze {
  const variants = vocabClozeVariants(word);
  if (variants.length === 1) return variants[0]!;
  return pickNWithSeed(variants, 1, `${runSeed}:cloze-template:${word.id}`)[0]!;
}

/** Replace `__1__` (etc.) with the learner's answer for TTS. */
export function fillVocabClozeTemplate(
  template: string,
  blankId: string,
  answer: string,
): string {
  const re = new RegExp(`__${escapeRegExp(blankId)}__`, "g");
  return template.replace(re, answer).replace(/\s+/g, " ").trim();
}

export function buildVocabClozeWordBank(
  word: VocabWord,
  practiceWords: VocabWord[],
  seed: string,
): string[] {
  const distractors = shuffleWithSeed(
    practiceWords.filter((w) => w.id !== word.id).map((w) => w.lemma),
    `${seed}:cloze-bank:${word.id}`,
  );
  return shuffleWithSeed(
    [word.lemma, ...distractors.slice(0, 3)],
    `${seed}:cloze-shuffle:${word.id}`,
  );
}

export function buildVocabFillBlanksPayload(
  word: VocabWord,
  ctx: { seed: string; practiceWords: VocabWord[] },
  groupOrder: number,
): Record<string, unknown> {
  const cloze = pickVocabClozeForWord(word, ctx.seed);
  return {
    auto_advance_on_pass: true as const,
    type: "interaction",
    subtype: "fill_blanks",
    vocab_word_id: word.id,
    image_url: word.imageUrl,
    image_fit: "contain",
    image_size: "small",
    body_text: "",
    template: cloze.template,
    blanks: [{ id: "1", acceptable: cloze.acceptable }],
    word_bank: buildVocabClozeWordBank(word, ctx.practiceWords, ctx.seed),
    image_use_tts: true,
    image_read_aloud_text: word.tts ?? word.lemma,
    quiz_group_id: VOCAB_CLOZE_GROUP_ID,
    quiz_group_title: VOCAB_CLOZE_GROUP_TITLE,
    quiz_group_order: groupOrder,
  };
}
