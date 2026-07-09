import {
  wordAppearsInExampleSentence,
} from "@/lib/secondary/secondary-cloze-coverage";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildClozeClause(item: SecondaryVocabItem): string {
  const frame = item.sentenceFrame?.trim();
  if (frame && frame.includes("___")) {
    return frame.replace(/_{2,}/g, "____");
  }

  const example = item.exampleSentence?.trim();
  if (example) {
    if (wordAppearsInExampleSentence(item)) {
      const pattern = new RegExp(`\\b${escapeRegExp(item.word)}\\b`, "i");
      return example.replace(pattern, "____");
    }
    return `${example.replace(/[.!?]\s*$/, "")} (____).`;
  }

  return `Fill in the blank: ____ (${item.studentMeaningEn}).`;
}
