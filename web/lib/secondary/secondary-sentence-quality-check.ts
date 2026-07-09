import {
  isSecondarySentenceTextValid,
  normalizeSecondarySentenceText,
  SECONDARY_SENTENCE_MAX_LENGTH,
} from "@/lib/secondary/secondary-sentence-prompt";
import { sentenceContainsTargetWordForms } from "@/lib/secondary/secondary-sentence-word-forms";
import type { SecondaryPartOfSpeech } from "@/lib/secondary/types";

export const SECONDARY_SENTENCE_MIN_LENGTH = 8;

export type SecondarySentenceQualityInput = {
  text: string;
  targetWord: string;
  lemma?: string | null;
  partOfSpeech?: SecondaryPartOfSpeech | null;
};

export type SecondarySentenceQualityResult =
  | { ok: true; normalized: string }
  | { ok: false; message: string };

function startsWithCapitalLetter(text: string): boolean {
  const firstLetter = text.match(/[A-Za-z]/);
  return firstLetter !== null && firstLetter[0] === firstLetter[0].toUpperCase();
}

function endsWithSentencePunctuation(text: string): boolean {
  return /[.?!]$/.test(text);
}

export function validateSecondarySentenceQuality(
  input: SecondarySentenceQualityInput,
): SecondarySentenceQualityResult {
  const normalized = normalizeSecondarySentenceText(input.text);
  const targetWord = input.targetWord.trim();

  if (!isSecondarySentenceTextValid(normalized)) {
    if (normalized.length > SECONDARY_SENTENCE_MAX_LENGTH) {
      return { ok: false, message: "Your sentence is too long." };
    }
    return { ok: false, message: "Write a sentence before submitting." };
  }

  if (
    !sentenceContainsTargetWordForms(normalized, {
      targetWord,
      lemma: input.lemma,
      partOfSpeech: input.partOfSpeech,
    })
  ) {
    return {
      ok: false,
      message: `Use the word "${targetWord}" in your sentence.`,
    };
  }

  if (normalized.length < SECONDARY_SENTENCE_MIN_LENGTH) {
    return { ok: false, message: "Write a bit more — try a full sentence." };
  }

  if (!startsWithCapitalLetter(normalized)) {
    return { ok: false, message: "Start your sentence with a capital letter." };
  }

  if (!endsWithSentencePunctuation(normalized)) {
    return { ok: false, message: "End your sentence with . ? or !" };
  }

  return { ok: true, normalized };
}
