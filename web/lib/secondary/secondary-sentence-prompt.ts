import type { SecondaryVocabItem } from "@/lib/secondary/types";

export type SecondarySentencePrompt = {
  targetWord: string;
  meaningEn: string;
  instruction: string;
  frameHint: string | null;
};

function formatSentenceFrameHint(frame: string): string {
  return frame.replace(/_{2,}/g, "____").trim();
}

export function wordItemHasSentencePromptContent(item: SecondaryVocabItem): boolean {
  return Boolean(item.exampleSentence?.trim() || item.sentenceFrame?.trim());
}

export function buildSecondarySentencePrompt(item: SecondaryVocabItem): SecondarySentencePrompt {
  const frame = item.sentenceFrame?.trim();
  const frameHint =
    frame && /_{2,}/.test(frame) ? formatSentenceFrameHint(frame) : null;

  return {
    targetWord: item.word,
    meaningEn: item.studentMeaningEn,
    instruction: `Write a sentence using the word "${item.word}" (${item.studentMeaningEn}). Your teacher will review it.`,
    frameHint,
  };
}

export const SECONDARY_SENTENCE_MAX_LENGTH = 500;

export function normalizeSecondarySentenceText(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function isSecondarySentenceTextValid(raw: string): boolean {
  const normalized = normalizeSecondarySentenceText(raw);
  return normalized.length > 0 && normalized.length <= SECONDARY_SENTENCE_MAX_LENGTH;
}
