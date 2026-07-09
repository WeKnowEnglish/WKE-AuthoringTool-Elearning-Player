import {
  classifySecondaryClozeTier,
  wordAppearsInExampleSentence,
} from "@/lib/secondary/secondary-cloze-coverage";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

export type SecondaryLearnExampleLine =
  | { kind: "sentence"; text: string; highlightWord: string }
  | { kind: "phrase"; text: string };

export type SecondaryLearnSectionVisibility = {
  examples: boolean;
  cloze: boolean;
  memory: boolean;
};

const MAX_CHUNK_LINES = 2;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatSecondarySyllableHint(syllables: string[]): string {
  return syllables.map((part) => part.trim()).filter(Boolean).join("-");
}

export function buildSecondaryLearnClozePreview(item: SecondaryVocabItem): string | null {
  const tier = classifySecondaryClozeTier(item);
  if (tier !== "A" && tier !== "B") return null;

  const frame = item.sentenceFrame?.trim();
  if (frame && /_{2,}/.test(frame)) {
    return frame.replace(/_{2,}/g, "____");
  }

  const example = item.exampleSentence?.trim();
  if (example && wordAppearsInExampleSentence(item)) {
    const pattern = new RegExp(`\\b${escapeRegExp(item.word)}\\b`, "i");
    return example.replace(pattern, "____");
  }

  return null;
}

export function buildSecondaryLearnExampleLines(item: SecondaryVocabItem): SecondaryLearnExampleLine[] {
  const lines: SecondaryLearnExampleLine[] = [];

  const example = item.exampleSentence?.trim();
  if (example) {
    lines.push({
      kind: "sentence",
      text: example,
      highlightWord: item.word,
    });
  }

  const chunks = (item.commonChunks ?? [])
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, MAX_CHUNK_LINES);

  for (const chunk of chunks) {
    lines.push({ kind: "phrase", text: chunk });
  }

  return lines;
}

export function getSecondaryLearnSectionVisibility(
  item: SecondaryVocabItem,
): SecondaryLearnSectionVisibility {
  const examples = buildSecondaryLearnExampleLines(item).length > 0;
  const cloze = buildSecondaryLearnClozePreview(item) !== null;
  const support = item.spellingSupport;
  const memory = Boolean(
    support &&
      (support.syllables.length > 0 || support.commonMistakes.length > 0),
  );

  return { examples, cloze, memory };
}

export function splitTextAroundWord(text: string, word: string): Array<{ text: string; highlight: boolean }> {
  if (!word.trim()) return [{ text, highlight: false }];

  const pattern = new RegExp(`(\\b${escapeRegExp(word)}\\b)`, "gi");
  const parts = text.split(pattern);
  if (parts.length <= 1) return [{ text, highlight: false }];

  const normalizedWord = word.toLowerCase();
  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlight: part.toLowerCase() === normalizedWord,
    }));
}
