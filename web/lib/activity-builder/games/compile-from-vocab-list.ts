import type { GamesAuthoringDocument, GamesMcItem } from "@/lib/activity-builder/games/types-mc";
import type {
  GamesLetterMixupAuthoringDocument,
  GamesLetterMixupItem,
} from "@/lib/activity-builder/games/types-letter-mixup";
import type {
  GamesFlashcardFace,
  GamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/types-flashcards";
import type {
  VocabListEntry,
  VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list/types";
import { makeMcOptions } from "@/lib/activity-builder/games/mc-options";
import { pickDistractors } from "@/lib/activity-builder/games/pick-distractors";
import { compileFlashcardsFromEntries } from "@/lib/activity-builder/games/compile-flashcards-from-entries";
import { validateGamesAuthoringDocument } from "@/lib/activity-builder/games/mc-quiz";
import { validateGamesLetterMixupAuthoringDocument } from "@/lib/activity-builder/games/letter-mixup";

export type VocabCompileFormat = "multiple_choice" | "letter_mixup" | "flashcards";

export type CompileQuizzesFromVocabListInput = {
  list: VocabularyListDocument;
  /** Empty / omit = all entries. */
  selectedEntryIds?: string[];
  formats: VocabCompileFormat[];
  mcMasterQuestion?: string;
  /** Total choices including the correct answer (2–6). Default 4. */
  mcOptionCount?: number;
  mcShuffleOptions?: boolean;
  /**
   * Stable MC item/option ids for Learning Track overlay editing.
   * Defaults false (bank compile keeps random shuffle).
   */
  mcStableItems?: boolean;
  letterPrompt?: string;
  letterShuffleLetters?: boolean;
  letterCaseSensitive?: boolean;
  /** Pack-wide flashcards face layout when compiling flashcards. */
  flashcardsFrontFaces?: GamesFlashcardFace[];
  flashcardsBackFaces?: GamesFlashcardFace[];
  flashcardsShuffleCards?: boolean;
};

export type VocabCompileResult = {
  format: VocabCompileFormat;
  href: string;
  label: string;
  itemCount: number;
  document:
    | GamesAuthoringDocument
    | GamesLetterMixupAuthoringDocument
    | GamesFlashcardsAuthoringDocument;
};

export type VocabCompileSkipped = {
  entryId: string;
  word: string;
  format: VocabCompileFormat;
  reason: string;
};

export type VocabCompileOutput = {
  results: VocabCompileResult[];
  skipped: VocabCompileSkipped[];
};

function slugifyId(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vocab-quiz"
  );
}

function resolveEntries(
  list: VocabularyListDocument,
  selectedEntryIds?: string[],
): VocabListEntry[] {
  if (!selectedEntryIds || selectedEntryIds.length === 0) {
    return [...list.entries];
  }
  const wanted = new Set(selectedEntryIds);
  return list.entries.filter((entry) => wanted.has(entry.id));
}

function clampOptionCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 4;
  return Math.min(6, Math.max(2, Math.round(value)));
}

function compileMcQuizFromEntries(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  options: {
    masterQuestion: string;
    optionCount: number;
    shuffleOptions: boolean;
    /** Stable item ids + distractor order (LTC overlays). Play still shuffles when enabled. */
    stableItems?: boolean;
  },
): { document: GamesAuthoringDocument; skipped: VocabCompileSkipped[] } {
  const skipped: VocabCompileSkipped[] = [];
  const usable = entries.filter((entry) => {
    if (!entry.word.trim()) {
      skipped.push({
        entryId: entry.id,
        word: entry.word,
        format: "multiple_choice",
        reason: "Word is empty.",
      });
      return false;
    }
    return true;
  });

  if (usable.length < 1) {
    throw new Error("Multiple choice needs at least one word.");
  }

  const vocabulary = usable.map((entry) => entry.word.trim());
  const name = `${list.name.trim() || "Vocabulary"} · MCQ`;
  const quizGroupId = slugifyId(name);
  const question = options.masterQuestion.trim() || "What is this?";
  const distractorCount = Math.max(1, options.optionCount - 1);
  const stable = options.stableItems === true;

  const items: GamesMcItem[] = usable.map((entry, index) => {
    const word = entry.word.trim();
    const distractors = pickDistractors(word, vocabulary, distractorCount, {
      stable,
    });
    const labels = stable
      ? [word, ...distractors]
      : (() => {
          const mixed = [word, ...distractors];
          for (let i = mixed.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = mixed[i]!;
            mixed[i] = mixed[j]!;
            mixed[j] = tmp;
          }
          return mixed;
        })();
    const made = makeMcOptions(labels);
    const correct = made.find((option) => option.label === word);
    if (!correct) {
      throw new Error(`Could not place correct option for "${word}".`);
    }
    const item: GamesMcItem = {
      id: stable ? `mc-${entry.id}` : `q${index + 1}`,
      question,
      options: made,
      correctOptionId: correct.id,
    };
    if (entry.imageUrl) {
      item.imageUrl = entry.imageUrl;
      item.imageFit = "contain";
    }
    if (entry.audioUrl) {
      item.promptAudioUrl = entry.audioUrl;
    }
    return item;
  });

  const document: GamesAuthoringDocument = {
    version: 1,
    kind: "activity-authoring",
    id: quizGroupId,
    name,
    educationalIntent: {
      objective: `Practice target vocabulary: ${vocabulary.join(", ")}.`,
      successCriteria: "Students choose the correct word for each question.",
      vocabulary: [...vocabulary],
      ...(list.cefr ? { cefr: list.cefr } : {}),
    },
    content: {
      instruction: "Choose the best answer.",
      completionMessage: "Nice work!",
    },
    interaction: {
      type: "games",
      format: "multiple_choice",
      quizGroupId,
      quizGroupTitle: name,
      shuffleOptionsDefault: options.shuffleOptions,
      items,
    },
  };

  return { document: validateGamesAuthoringDocument(document), skipped };
}

function compileLetterMixupFromEntries(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  options: {
    prompt: string;
    shuffleLetters: boolean;
    caseSensitive: boolean;
  },
): { document: GamesLetterMixupAuthoringDocument; skipped: VocabCompileSkipped[] } {
  const skipped: VocabCompileSkipped[] = [];
  const usable = entries.filter((entry) => {
    const word = entry.word.trim().replace(/\s+/g, " ");
    if (!word) {
      skipped.push({
        entryId: entry.id,
        word: entry.word,
        format: "letter_mixup",
        reason: "Word is empty.",
      });
      return false;
    }
    const letterCount = word.replace(/\s+/g, "").length;
    if (letterCount < 2) {
      skipped.push({
        entryId: entry.id,
        word,
        format: "letter_mixup",
        reason: "Letter scramble needs at least 2 letters.",
      });
      return false;
    }
    return true;
  });

  if (usable.length < 1) {
    throw new Error(
      "Letter scramble needs at least one usable entry (2+ letters; multi-word phrases OK).",
    );
  }

  const vocabulary = usable.map((entry) => entry.word.trim().replace(/\s+/g, " "));
  const name = `${list.name.trim() || "Vocabulary"} · Letter scramble`;
  const quizGroupId = slugifyId(name);
  const prompt =
    options.prompt.trim() || "Unscramble the letters to spell the word.";

  const items: GamesLetterMixupItem[] = usable.map((entry, index) => {
    const item: GamesLetterMixupItem = {
      id: `lm${index + 1}`,
      targetWord: entry.word.trim().replace(/\s+/g, " "),
      imageUseTts: !entry.audioUrl,
    };
    if (entry.imageUrl) {
      item.imageUrl = entry.imageUrl;
      item.imageFit = "contain";
    }
    if (entry.audioUrl) {
      item.imageAudioUrl = entry.audioUrl;
      item.imageUseTts = false;
    }
    return item;
  });

  const document: GamesLetterMixupAuthoringDocument = {
    version: 1,
    kind: "activity-authoring",
    id: quizGroupId,
    name,
    educationalIntent: {
      objective: `Spell target vocabulary: ${vocabulary.join(", ")}.`,
      successCriteria: "Students rebuild each target word correctly.",
      vocabulary: [...vocabulary],
      ...(list.cefr ? { cefr: list.cefr } : {}),
    },
    content: {
      instruction: prompt,
      completionMessage: "Great spelling!",
    },
    interaction: {
      type: "games",
      format: "letter_mixup",
      quizGroupId,
      quizGroupTitle: name,
      promptDefault: prompt,
      shuffleLettersDefault: options.shuffleLetters,
      caseSensitiveDefault: options.caseSensitive,
      items,
    },
  };

  return {
    document: validateGamesLetterMixupAuthoringDocument(document),
    skipped,
  };
}

const FORMAT_META: Record<VocabCompileFormat, { href: string; label: string }> = {
  multiple_choice: {
    href: "/teacher/activity-builder",
    label: "Multiple choice",
  },
  letter_mixup: {
    href: "/teacher/activity-builder",
    label: "Letter scramble",
  },
  flashcards: {
    href: "/teacher/activity-builder",
    label: "Flashcards",
  },
};

/** Compile selected vocab list entries into quiz authoring docs. */
export function compileQuizzesFromVocabList(
  input: CompileQuizzesFromVocabListInput,
): VocabCompileOutput {
  if (!input.formats.length) {
    throw new Error("Choose at least one quiz format.");
  }

  const entries = resolveEntries(input.list, input.selectedEntryIds);
  if (entries.length < 1) {
    throw new Error("Select at least one vocabulary word.");
  }

  const results: VocabCompileResult[] = [];
  const skipped: VocabCompileSkipped[] = [];

  if (input.formats.includes("multiple_choice")) {
    const compiled = compileMcQuizFromEntries(input.list, entries, {
      masterQuestion: input.mcMasterQuestion ?? "What is this?",
      optionCount: clampOptionCount(input.mcOptionCount),
      shuffleOptions: input.mcShuffleOptions !== false,
      stableItems: input.mcStableItems === true,
    });
    skipped.push(...compiled.skipped);
    results.push({
      format: "multiple_choice",
      href: FORMAT_META.multiple_choice.href,
      label: FORMAT_META.multiple_choice.label,
      itemCount: compiled.document.interaction.items.length,
      document: compiled.document,
    });
  }

  if (input.formats.includes("letter_mixup")) {
    const compiled = compileLetterMixupFromEntries(input.list, entries, {
      prompt: input.letterPrompt ?? "Unscramble the letters to spell the word.",
      shuffleLetters: input.letterShuffleLetters !== false,
      caseSensitive: input.letterCaseSensitive === true,
    });
    skipped.push(...compiled.skipped);
    results.push({
      format: "letter_mixup",
      href: FORMAT_META.letter_mixup.href,
      label: FORMAT_META.letter_mixup.label,
      itemCount: compiled.document.interaction.items.length,
      document: compiled.document,
    });
  }

  if (input.formats.includes("flashcards")) {
    const compiled = compileFlashcardsFromEntries(
      input.list,
      entries,
      {
        frontFaces: input.flashcardsFrontFaces?.length
          ? input.flashcardsFrontFaces
          : ["picture"],
        backFaces: input.flashcardsBackFaces?.length
          ? input.flashcardsBackFaces
          : ["word", "example"],
      },
      { shuffleCards: input.flashcardsShuffleCards !== false },
    );
    skipped.push(
      ...compiled.skipped.map((item) => ({
        ...item,
        format: "flashcards" as const,
      })),
    );
    results.push({
      format: "flashcards",
      href: FORMAT_META.flashcards.href,
      label: FORMAT_META.flashcards.label,
      itemCount: compiled.document.interaction.cards.length,
      document: compiled.document,
    });
  }

  return { results, skipped };
}
