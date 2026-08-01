import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import { resolveVocabCompileEntries } from "@/lib/activity-builder/games/compile-from-vocab-list";
import { placeholderImageUrl } from "@/lib/activity-builder/games/authoring-shell";
import {
  DEFAULT_PICTURE_CLOZE_INSTRUCTIONS,
  DEFAULT_PICTURE_CLOZE_PROMPT,
  PICTURE_CLOZE_KIND,
  type PictureClozeDocument,
  type PictureClozeItem,
} from "@/lib/picture-cloze/types";
import { validatePictureClozeDocument } from "@/lib/picture-cloze/document";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugifyId(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "picture-cloze";
}

/** Split a sentence around the first whole-word match of `word`. */
export function splitSentenceAroundWord(
  sentence: string,
  word: string,
): { before: string; after: string } | null {
  const re = new RegExp(`\\b${escapeRegExp(word.trim())}\\b`, "i");
  const match = sentence.match(re);
  if (!match || match.index == null) return null;
  return {
    before: sentence.slice(0, match.index),
    after: sentence.slice(match.index + match[0].length),
  };
}

function fallbackSentence(word: string): string {
  return `This is a ${word}.`;
}

export type CompilePictureClozeFromVocabListInput = {
  list: VocabularyListDocument;
  selectedEntryIds?: string[];
  /** Prefer entries that already have images (default true). */
  requireImage?: boolean;
  maxItems?: number;
};

/**
 * Build a picture cloze document from a vocabulary list.
 * Needs at least one usable word (image preferred). Word bank includes all selected words.
 */
export function compilePictureClozeFromVocabList(
  input: CompilePictureClozeFromVocabListInput,
): PictureClozeDocument {
  const entries = resolveVocabCompileEntries(input.list, input.selectedEntryIds);
  if (entries.length < 1) {
    throw new Error("Select at least one vocabulary word.");
  }

  const requireImage = input.requireImage !== false;
  const maxItems = Math.max(
    1,
    Math.min(12, Math.round(input.maxItems ?? entries.length)),
  );

  const wordBank = [
    ...new Set(
      entries
        .map((entry) => entry.word.trim())
        .filter((word) => word.length > 0),
    ),
  ];
  if (wordBank.length < 1) {
    throw new Error("Picture cloze needs at least one non-empty word.");
  }

  const items: PictureClozeItem[] = [];
  for (const entry of entries) {
    if (items.length >= maxItems) break;
    const word = entry.word.trim();
    if (!word) continue;
    const imageUrl = entry.imageUrl?.trim();
    if (requireImage && !imageUrl) continue;

    const example = entry.example?.trim() || fallbackSentence(word);
    const split =
      splitSentenceAroundWord(example, word) ??
      splitSentenceAroundWord(fallbackSentence(word), word);
    if (!split) continue;

    items.push({
      id: `pc-${entry.id}`,
      imageUrl: imageUrl || placeholderImageUrl(word),
      imageAlt: entry.definitionEn?.trim() || `Picture for ${word}`,
      prompt: DEFAULT_PICTURE_CLOZE_PROMPT,
      sentenceBefore: split.before,
      sentenceAfter: split.after,
      acceptedAnswers: [word],
    });
  }

  if (items.length < 1) {
    throw new Error(
      requireImage
        ? "Picture cloze needs at least one word with an image."
        : "Could not build any picture cloze items from this list.",
    );
  }

  const listName = input.list.name.trim() || "Vocabulary";
  const title = `${listName} · Picture cloze`;
  return validatePictureClozeDocument({
    version: 1,
    kind: PICTURE_CLOZE_KIND,
    id: slugifyId(title),
    title,
    instructions: DEFAULT_PICTURE_CLOZE_INSTRUCTIONS,
    wordBank,
    items,
    ...(input.list.cefr ? { cefr: input.list.cefr } : {}),
  });
}
