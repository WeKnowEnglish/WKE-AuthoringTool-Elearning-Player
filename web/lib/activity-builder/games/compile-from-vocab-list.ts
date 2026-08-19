import type { GamesAuthoringDocument, GamesMcItem } from "@/lib/activity-builder/games/types-mc";
import type {
  GamesLetterMixupAuthoringDocument,
  GamesLetterMixupItem,
} from "@/lib/activity-builder/games/types-letter-mixup";
import type {
  GamesFlashcardFace,
  GamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/types-flashcards";
import type { GamesListenAndChooseAuthoringDocument } from "@/lib/activity-builder/games/types-listen-and-choose";
import type { GamesLineMatchAuthoringDocument } from "@/lib/activity-builder/games/types-line-match";
import type { GamesTrueFalseAuthoringDocument } from "@/lib/activity-builder/games/types-true-false";
import type { GamesSentenceScrambleAuthoringDocument } from "@/lib/activity-builder/games/types-sentence-scramble";
import type { GamesFillBlanksAuthoringDocument } from "@/lib/activity-builder/games/types-fill-blanks";
import type {
  GamesCrosswordClueMode,
  GamesMemoryTextMode,
  GamesWordGameAuthoringDocument,
  GamesWordGameFormat,
} from "@/lib/activity-builder/games/types-word-games";
import type {
  VocabListEntry,
  VocabularyListDocument,
} from "@/lib/activity-builder/vocabulary-list/types";
import { makeMcOptions } from "@/lib/activity-builder/games/mc-options";
import { pickDistractors } from "@/lib/activity-builder/games/pick-distractors";
import { compileFlashcardsFromEntries } from "@/lib/activity-builder/games/compile-flashcards-from-entries";
import { validateGamesAuthoringDocument } from "@/lib/activity-builder/games/mc-quiz";
import { validateGamesLetterMixupAuthoringDocument } from "@/lib/activity-builder/games/letter-mixup";
import { validateGamesListenAndChooseAuthoringDocument } from "@/lib/activity-builder/games/listen-and-choose";
import { validateGamesLineMatchAuthoringDocument } from "@/lib/activity-builder/games/line-match";
import { validateGamesTrueFalseAuthoringDocument } from "@/lib/activity-builder/games/true-false";
import { validateGamesSentenceScrambleAuthoringDocument } from "@/lib/activity-builder/games/sentence-scramble";
import { validateGamesFillBlanksAuthoringDocument } from "@/lib/activity-builder/games/fill-blanks";
import { validateGamesWordGameAuthoringDocument } from "@/lib/activity-builder/games/word-games";
import { placeholderImageUrl, slugifyQuizId } from "@/lib/activity-builder/games/authoring-shell";
import {
  CORE_MODULE_IDS,
  type CoreModuleId,
  getCoreModuleMeta,
} from "@/lib/activity-builder/core-modules/types";
import {
  inferLemmaGrammar,
  thisLemmaStatement,
} from "@/lib/vocabulary-templates/lemma-statement";
import {
  packSentenceScrambleStarter,
  scrambleTilesFromSentence,
  tokenizeSentenceForScramble,
} from "@/lib/vocabulary/pack-quiz/compile-pack-sentence-scramble-quiz";
import { randomWithSeed, shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";

/** @deprecated Prefer `CoreModuleId` from core-modules — same string union. */
export type VocabCompileFormat = CoreModuleId;

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
  /** Student instruction for Word search, Crossword, or Memory. */
  wordGamePrompt?: string;
  /** Pack-wide flashcards face layout when compiling flashcards. */
  flashcardsFrontFaces?: GamesFlashcardFace[];
  flashcardsBackFaces?: GamesFlashcardFace[];
  flashcardsShuffleCards?: boolean;
  /** Text shown opposite the picture in Memory. */
  memoryTextMode?: GamesMemoryTextMode;
  /** Vocabulary field used for Crossword clues. */
  crosswordClueMode?: GamesCrosswordClueMode;
};

export type VocabCompileAuthoringDocument =
  | GamesAuthoringDocument
  | GamesLetterMixupAuthoringDocument
  | GamesFlashcardsAuthoringDocument
  | GamesListenAndChooseAuthoringDocument
  | GamesLineMatchAuthoringDocument
  | GamesTrueFalseAuthoringDocument
  | GamesSentenceScrambleAuthoringDocument
  | GamesFillBlanksAuthoringDocument
  | GamesWordGameAuthoringDocument;

export type VocabCompileResult = {
  format: VocabCompileFormat;
  href: string;
  label: string;
  itemCount: number;
  document: VocabCompileAuthoringDocument;
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

export type VocabModuleCompileBundle = {
  document: VocabCompileAuthoringDocument;
  skipped: VocabCompileSkipped[];
  itemCount: number;
};

function slugifyId(value: string): string {
  return slugifyQuizId(value);
}

function entryImageUrl(entry: VocabListEntry): string {
  return entry.imageUrl?.trim() || placeholderImageUrl(entry.word.trim() || "word");
}

function meaningStatement(entry: VocabListEntry): string | null {
  const def = entry.definitionEn?.trim();
  if (!def) return null;
  return `"${entry.word.trim()}" means ${def.replace(/\.$/, "")}.`;
}

function lemmaPictureStatement(word: string): string {
  return thisLemmaStatement({
    lemma: word.trim(),
    grammar: inferLemmaGrammar(word),
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blankWordInSentence(sentence: string, word: string): string | null {
  const re = new RegExp(`\\b${escapeRegExp(word.trim())}\\b`, "i");
  if (!re.test(sentence)) return null;
  return sentence.replace(re, "__1__");
}

function acceptableForms(word: string): string[] {
  const trimmed = word.trim();
  const lower = trimmed.toLowerCase();
  const titled = lower.charAt(0).toUpperCase() + lower.slice(1);
  return [...new Set([trimmed, lower, titled].filter(Boolean))];
}

export function resolveVocabCompileEntries(
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

export function compileMultipleChoiceModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  const options = {
    masterQuestion: input.mcMasterQuestion ?? "What is this?",
    optionCount: clampOptionCount(input.mcOptionCount),
    shuffleOptions: input.mcShuffleOptions !== false,
    stableItems: input.mcStableItems === true,
  };
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

  const validated = validateGamesAuthoringDocument(document);
  return {
    document: validated,
    skipped,
    itemCount: validated.interaction.items.length,
  };
}

export function compileLetterMixupModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  const options = {
    prompt: input.letterPrompt ?? "Unscramble the letters to spell the word.",
    shuffleLetters: input.letterShuffleLetters !== false,
    caseSensitive: input.letterCaseSensitive === true,
  };
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

  const validated = validateGamesLetterMixupAuthoringDocument(document);
  return {
    document: validated,
    skipped,
    itemCount: validated.interaction.items.length,
  };
}

export function compileFlashcardsModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  const compiled = compileFlashcardsFromEntries(
    list,
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
  return {
    document: compiled.document,
    skipped: compiled.skipped.map((item) => ({
      ...item,
      format: "flashcards" as const,
    })),
    itemCount: compiled.document.interaction.cards.length,
  };
}

export function compileListenAndChooseModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  _input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  const skipped: VocabCompileSkipped[] = [];
  const usable = entries.filter((entry) => {
    if (!entry.word.trim()) {
      skipped.push({
        entryId: entry.id,
        word: entry.word,
        format: "listen_and_choose",
        reason: "Word is empty.",
      });
      return false;
    }
    return true;
  });
  if (usable.length < 1) {
    throw new Error("Listen and choose needs at least one word.");
  }

  const vocabulary = usable.map((entry) => entry.word.trim());
  const byWord = new Map(usable.map((entry) => [entry.word.trim().toLowerCase(), entry]));
  const name = `${list.name.trim() || "Vocabulary"} · Listen and choose`;
  const quizGroupId = slugifyId(name);
  const bodyTextDefault = "Listen, then choose the picture.";

  const document: GamesListenAndChooseAuthoringDocument = {
    version: 1,
    kind: "activity-authoring",
    id: quizGroupId,
    name,
    educationalIntent: {
      objective: `Listen and match pictures for: ${vocabulary.join(", ")}.`,
      successCriteria: "Students choose the picture that matches each prompt.",
      vocabulary: [...vocabulary],
      ...(list.cefr ? { cefr: list.cefr } : {}),
    },
    content: {
      instruction: bodyTextDefault,
      completionMessage: "Great listening!",
    },
    interaction: {
      type: "games",
      format: "listen_and_choose",
      quizGroupId,
      quizGroupTitle: name,
      bodyTextDefault,
      autoPlayDefault: true,
      shuffleChoicesDefault: true,
      items: usable.map((entry, index) => {
        const word = entry.word.trim();
        const distractorWords = pickDistractors(word, vocabulary, 2, { stable: true });
        const choiceEntries: VocabListEntry[] = [
          entry,
          ...distractorWords.map((distractor) => {
            const found = byWord.get(distractor.toLowerCase());
            if (found) return found;
            return {
              id: `pad_${distractor}`,
              word: distractor,
              imageUrl: placeholderImageUrl(distractor),
            } satisfies VocabListEntry;
          }),
        ];
        const choices = choiceEntries.map((choice, choiceIndex) => ({
          id: String.fromCharCode(97 + choiceIndex),
          imageUrl: entryImageUrl(choice),
          label: choice.word.trim(),
        }));
        const correct = choices.find(
          (choice) => choice.label.toLowerCase() === word.toLowerCase(),
        );
        const dialogText = entry.example?.trim() || word;
        const exampleClip = entry.exampleAudioUrl?.trim();
        const wordClip = entry.audioUrl?.trim();
        const promptAudioUrl =
          entry.example?.trim() && exampleClip
            ? exampleClip
            : wordClip || exampleClip || undefined;
        return {
          id: `listen-${entry.id}`,
          dialogText,
          ...(promptAudioUrl ? { promptAudioUrl } : {}),
          imageFit: "contain" as const,
          choices,
          correctChoiceId: correct?.id ?? "a",
        };
      }),
    },
  };

  const validated = validateGamesListenAndChooseAuthoringDocument(document);
  return {
    document: validated,
    skipped,
    itemCount: validated.interaction.items.length,
  };
}

export function compileLineMatchModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  _input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  const skipped: VocabCompileSkipped[] = [];
  const usable = entries.filter((entry) => {
    if (!entry.word.trim()) {
      skipped.push({
        entryId: entry.id,
        word: entry.word,
        format: "line_match",
        reason: "Word is empty.",
      });
      return false;
    }
    return true;
  });
  if (usable.length < 2) {
    throw new Error("Line match needs at least two words.");
  }

  const vocabulary = usable.map((entry) => entry.word.trim());
  const name = `${list.name.trim() || "Vocabulary"} · Line match`;
  const quizGroupId = slugifyId(name);
  const bodyTextDefault = "Draw a line from each word to its picture.";
  const tokens = usable.map((entry) => ({
    id: `tok_${entry.id}`,
    label: entry.word.trim(),
  }));
  const zones = shuffleWithSeed(
    usable.map((entry) => ({
      id: `z_${entry.id}`,
      label: entry.word.trim(),
      imageUrl: entryImageUrl(entry),
    })),
    `${quizGroupId}:zones`,
  );
  const correctMap = Object.fromEntries(
    usable.map((entry) => [`tok_${entry.id}`, `z_${entry.id}`]),
  );

  const document: GamesLineMatchAuthoringDocument = {
    version: 1,
    kind: "activity-authoring",
    id: quizGroupId,
    name,
    educationalIntent: {
      objective: `Match words to pictures: ${vocabulary.join(", ")}.`,
      successCriteria: "Students connect every word to the correct picture.",
      vocabulary: [...vocabulary],
      ...(list.cefr ? { cefr: list.cefr } : {}),
    },
    content: {
      instruction: bodyTextDefault,
      completionMessage: "Nice matching!",
    },
    interaction: {
      type: "games",
      format: "line_match",
      quizGroupId,
      quizGroupTitle: name,
      bodyTextDefault,
      screens: [
        {
          id: "match-1",
          tokens,
          zones,
          correctMap,
        },
      ],
    },
  };

  const validated = validateGamesLineMatchAuthoringDocument(document);
  return {
    document: validated,
    skipped,
    itemCount: validated.interaction.screens.length,
  };
}

export function compileTrueFalseModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  _input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  const skipped: VocabCompileSkipped[] = [];
  const usable = entries.filter((entry) => {
    if (!entry.word.trim()) {
      skipped.push({
        entryId: entry.id,
        word: entry.word,
        format: "true_false",
        reason: "Word is empty.",
      });
      return false;
    }
    return true;
  });
  if (usable.length < 1) {
    throw new Error("True/false needs at least one word.");
  }

  const vocabulary = usable.map((entry) => entry.word.trim());
  const name = `${list.name.trim() || "Vocabulary"} · True / false`;
  const quizGroupId = slugifyId(name);

  const items = usable.map((entry) => {
    const seed = `${quizGroupId}:${entry.id}`;
    const truthPicture = lemmaPictureStatement(entry.word);
    const truthMeaning = meaningStatement(entry);
    const wantTrue = randomWithSeed(`${seed}:polarity`) >= 0.5;
    const preferMeaning =
      Boolean(truthMeaning) && randomWithSeed(`${seed}:style`) >= 0.45;

    let statement: string;
    let correct: boolean;
    let pictureTruthStatement = truthPicture;

    if (wantTrue || usable.length === 1) {
      correct = true;
      statement =
        preferMeaning && truthMeaning ? truthMeaning : truthPicture;
      if (preferMeaning && truthMeaning) pictureTruthStatement = truthMeaning;
    } else {
      const others = usable.filter((row) => row.id !== entry.id);
      const other =
        shuffleWithSeed(others, `${seed}:other`)[0] ?? null;
      if (!other) {
        correct = true;
        statement =
          preferMeaning && truthMeaning ? truthMeaning : truthPicture;
      } else {
        correct = false;
        const otherMeaning = meaningStatement(other);
        if (preferMeaning && truthMeaning && otherMeaning) {
          const def = other.definitionEn!.trim().replace(/\.$/, "");
          statement = `"${entry.word.trim()}" means ${def}.`;
          pictureTruthStatement = truthMeaning;
        } else {
          statement = lemmaPictureStatement(other.word);
          pictureTruthStatement = truthPicture;
        }
      }
    }

    return {
      id: `tf-${entry.id}`,
      statement,
      correct,
      pictureTruthStatement,
      ...(entry.imageUrl?.trim()
        ? { imageUrl: entry.imageUrl.trim(), imageFit: "contain" as const }
        : {}),
    };
  });

  const document: GamesTrueFalseAuthoringDocument = {
    version: 1,
    kind: "activity-authoring",
    id: quizGroupId,
    name,
    educationalIntent: {
      objective: `Judge true/false claims about: ${vocabulary.join(", ")}.`,
      successCriteria: "Students decide whether each statement is true or false.",
      vocabulary: [...vocabulary],
      ...(list.cefr ? { cefr: list.cefr } : {}),
    },
    content: {
      instruction: "Is this true or false?",
      completionMessage: "Nice thinking!",
    },
    interaction: {
      type: "games",
      format: "true_false",
      quizGroupId,
      quizGroupTitle: name,
      items,
    },
  };

  const validated = validateGamesTrueFalseAuthoringDocument(document);
  return {
    document: validated,
    skipped,
    itemCount: validated.interaction.items.length,
  };
}

export function compileSentenceScrambleModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  _input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  const skipped: VocabCompileSkipped[] = [];
  const usable = entries.filter((entry) => {
    if (!entry.word.trim()) {
      skipped.push({
        entryId: entry.id,
        word: entry.word,
        format: "sentence_scramble",
        reason: "Word is empty.",
      });
      return false;
    }
    return true;
  });
  if (usable.length < 1) {
    throw new Error("Sentence scramble needs at least one word.");
  }

  const vocabulary = usable.map((entry) => entry.word.trim());
  const name = `${list.name.trim() || "Vocabulary"} · Sentence scramble`;
  const quizGroupId = slugifyId(name);
  const bodyTextDefault = "Put the words in order.";

  const items = usable.map((entry) => {
    const curated = entry.example?.trim() ?? "";
    const sentence =
      curated && tokenizeSentenceForScramble(curated).length >= 2
        ? curated
        : packSentenceScrambleStarter(entry.word, `${quizGroupId}:${entry.id}`);
    const correctOrder = scrambleTilesFromSentence(sentence);
    return {
      id: `ss-${entry.id}`,
      correctOrder,
      ...(entry.imageUrl?.trim()
        ? { imageUrl: entry.imageUrl.trim(), imageFit: "contain" as const }
        : {}),
    };
  });

  const document: GamesSentenceScrambleAuthoringDocument = {
    version: 1,
    kind: "activity-authoring",
    id: quizGroupId,
    name,
    educationalIntent: {
      objective: `Rebuild sentences for: ${vocabulary.join(", ")}.`,
      successCriteria: "Students put each sentence in the correct order.",
      vocabulary: [...vocabulary],
      ...(list.cefr ? { cefr: list.cefr } : {}),
    },
    content: {
      instruction: bodyTextDefault,
      completionMessage: "Great sentences!",
    },
    interaction: {
      type: "games",
      format: "sentence_scramble",
      quizGroupId,
      quizGroupTitle: name,
      bodyTextDefault,
      items,
    },
  };

  const validated = validateGamesSentenceScrambleAuthoringDocument(document);
  return {
    document: validated,
    skipped,
    itemCount: validated.interaction.items.length,
  };
}

export function compileFillBlanksModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  _input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  const skipped: VocabCompileSkipped[] = [];
  const usable = entries.filter((entry) => {
    if (!entry.word.trim()) {
      skipped.push({
        entryId: entry.id,
        word: entry.word,
        format: "fill_blanks",
        reason: "Word is empty.",
      });
      return false;
    }
    return true;
  });
  if (usable.length < 1) {
    throw new Error("Fill in the blanks needs at least one word.");
  }

  const vocabulary = usable.map((entry) => entry.word.trim());
  const name = `${list.name.trim() || "Vocabulary"} · Fill in the blanks`;
  const quizGroupId = slugifyId(name);
  const bodyTextDefault = "Choose the missing word.";

  const items = usable.map((entry) => {
    const word = entry.word.trim();
    const fromExample = entry.example?.trim()
      ? blankWordInSentence(entry.example.trim(), word)
      : null;
    const template =
      fromExample ??
      lemmaPictureStatement(word).replace(
        new RegExp(`\\b${escapeRegExp(word)}\\b`, "i"),
        "__1__",
      );
    const distractors = pickDistractors(word, vocabulary, 3, { stable: true });
    return {
      id: `fb-${entry.id}`,
      template,
      blanks: [{ id: "1", acceptable: acceptableForms(word) }],
      wordBank: [word, ...distractors],
      ...(entry.imageUrl?.trim()
        ? { imageUrl: entry.imageUrl.trim(), imageFit: "contain" as const }
        : {}),
    };
  });

  const document: GamesFillBlanksAuthoringDocument = {
    version: 1,
    kind: "activity-authoring",
    id: quizGroupId,
    name,
    educationalIntent: {
      objective: `Complete sentences with: ${vocabulary.join(", ")}.`,
      successCriteria: "Students choose the correct word for each blank.",
      vocabulary: [...vocabulary],
      ...(list.cefr ? { cefr: list.cefr } : {}),
    },
    content: {
      instruction: bodyTextDefault,
      completionMessage: "Nice work!",
    },
    interaction: {
      type: "games",
      format: "fill_blanks",
      quizGroupId,
      quizGroupTitle: name,
      bodyTextDefault,
      items,
    },
  };

  const validated = validateGamesFillBlanksAuthoringDocument(document);
  return {
    document: validated,
    skipped,
    itemCount: validated.interaction.items.length,
  };
}

function wordGameLabel(format: GamesWordGameFormat): string {
  if (format === "wordsearch") return "Word search";
  if (format === "crossword") return "Crossword";
  return "Memory";
}

function compileWordGameModule(
  format: GamesWordGameFormat,
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  const skipped: VocabCompileSkipped[] = [];
  const limit = format === "memory" ? 10 : format === "crossword" ? 16 : 18;
  const memoryTextMode = input.memoryTextMode ?? "word";
  const crosswordClueMode = input.crosswordClueMode ?? "definition_or_example";
  const seen = new Set<string>();
  const usable: VocabListEntry[] = [];
  for (const entry of entries) {
    const word = entry.word.trim().replace(/\s+/g, " ");
    const letters = word.match(/[A-Za-z]/g) ?? [];
    let reason: string | null = null;
    if (letters.length < 2) reason = "Puzzle words need at least two letters.";
    else if (letters.length > 18) reason = "Puzzle words can have at most 18 letters.";
    else if (seen.has(word.toLocaleLowerCase())) reason = "Duplicate word.";
    else if (format === "memory" && !entry.imageUrl?.trim()) {
      reason = "Memory needs a picture for every pair.";
    } else if (
      format === "memory" &&
      memoryTextMode === "definition" &&
      !entry.definitionEn?.trim()
    ) {
      reason = "Definition vs picture needs a definition.";
    } else if (
      format === "memory" &&
      memoryTextMode === "example" &&
      !entry.example?.trim()
    ) {
      reason = "Example vs picture needs an example sentence.";
    } else if (
      format === "crossword" &&
      crosswordClueMode === "definition" &&
      !entry.definitionEn?.trim()
    ) {
      reason = "Definition clues need a definition.";
    } else if (
      format === "crossword" &&
      crosswordClueMode === "example" &&
      !entry.example?.trim()
    ) {
      reason = "Example-sentence clues need an example sentence.";
    } else if (
      format === "crossword" &&
      crosswordClueMode === "definition_or_example" &&
      !entry.definitionEn?.trim() &&
      !entry.example?.trim()
    ) {
      reason = "Crossword needs a definition or example sentence for each clue.";
    } else if (usable.length >= limit) {
      reason = `${wordGameLabel(format)} uses up to ${limit} words per activity.`;
    }
    if (reason) {
      skipped.push({ entryId: entry.id, word: entry.word, format, reason });
      continue;
    }
    seen.add(word.toLocaleLowerCase());
    usable.push({ ...entry, word });
  }
  if (usable.length < 2) {
    const detail = skipped[0]?.reason;
    throw new Error(
      `${wordGameLabel(format)} needs at least two usable words.${detail ? ` ${detail}` : ""}`,
    );
  }

  const vocabulary = usable.map((entry) => entry.word);
  const label = wordGameLabel(format);
  const name = `${list.name.trim() || "Vocabulary"} · ${label}`;
  const quizGroupId = slugifyId(name);
  const promptDefault =
    input.wordGamePrompt?.trim() ||
    (format === "wordsearch"
      ? "Find every word in the grid."
      : format === "crossword"
        ? "Use the clues to complete the crossword."
        : memoryTextMode === "word"
          ? "Match each word to its picture."
          : memoryTextMode === "definition"
            ? "Match each definition to its picture."
            : "Match each example sentence to its picture.");
  const document: GamesWordGameAuthoringDocument = {
    version: 1,
    kind: "activity-authoring",
    id: quizGroupId,
    name,
    educationalIntent: {
      objective:
        format === "memory"
          ? `Recall and match target vocabulary: ${vocabulary.join(", ")}.`
          : `Recognize and spell target vocabulary: ${vocabulary.join(", ")}.`,
      successCriteria:
        format === "wordsearch"
          ? "Students locate every target word."
          : format === "crossword"
            ? "Students spell every answer from its clue."
            : memoryTextMode === "word"
              ? "Students match every word to its picture."
              : memoryTextMode === "definition"
                ? "Students match every definition to its picture."
                : "Students match every example sentence to its picture.",
      vocabulary,
      ...(list.cefr ? { cefr: list.cefr } : {}),
    },
    content: {
      instruction: promptDefault,
      completionMessage:
        format === "wordsearch"
          ? "You found every word!"
          : format === "crossword"
            ? "Crossword complete!"
            : "You found every pair!",
    },
    interaction: {
      type: "games",
      format,
      quizGroupId,
      quizGroupTitle: name,
      promptDefault,
      gridSize: Math.min(
        18,
        Math.max(10, ...usable.map((entry) => (entry.word.match(/[A-Za-z]/g) ?? []).length), usable.length > 12 ? 14 : 12),
      ),
      allowBackwards: false,
      memoryUsePictures: true,
      memoryTextMode,
      crosswordClueMode,
      items: usable.map((entry) => ({
        id: entry.id,
        word: entry.word,
        ...(entry.definitionEn?.trim()
          ? { definition: entry.definitionEn.trim() }
          : {}),
        ...(entry.example?.trim() ? { example: entry.example.trim() } : {}),
        ...(entry.imageUrl?.trim()
          ? { imageUrl: entry.imageUrl.trim(), imageFit: entry.imageFit ?? "contain" }
          : {}),
      })),
    },
  };
  const validated = validateGamesWordGameAuthoringDocument(document, format);
  return { document: validated, skipped, itemCount: validated.interaction.items.length };
}

export function compileWordSearchModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  return compileWordGameModule("wordsearch", list, entries, input);
}

export function compileCrosswordModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  return compileWordGameModule("crossword", list, entries, input);
}

export function compileMemoryModule(
  list: VocabularyListDocument,
  entries: VocabListEntry[],
  input: CompileQuizzesFromVocabListInput,
): VocabModuleCompileBundle {
  return compileWordGameModule("memory", list, entries, input);
}

const MODULE_COMPILE: Record<
  CoreModuleId,
  (
    list: VocabularyListDocument,
    entries: VocabListEntry[],
    input: CompileQuizzesFromVocabListInput,
  ) => VocabModuleCompileBundle
> = {
  multiple_choice: compileMultipleChoiceModule,
  letter_mixup: compileLetterMixupModule,
  flashcards: compileFlashcardsModule,
  listen_and_choose: compileListenAndChooseModule,
  line_match: compileLineMatchModule,
  true_false: compileTrueFalseModule,
  sentence_scramble: compileSentenceScrambleModule,
  fill_blanks: compileFillBlanksModule,
  wordsearch: compileWordSearchModule,
  crossword: compileCrosswordModule,
  memory: compileMemoryModule,
};

/** Compile selected vocab list entries into quiz authoring docs (via core modules). */
export function compileQuizzesFromVocabList(
  input: CompileQuizzesFromVocabListInput,
): VocabCompileOutput {
  if (!input.formats.length) {
    throw new Error("Choose at least one quiz format.");
  }

  const entries = resolveVocabCompileEntries(input.list, input.selectedEntryIds);
  if (entries.length < 1) {
    throw new Error("Select at least one vocabulary word.");
  }

  const results: VocabCompileResult[] = [];
  const skipped: VocabCompileSkipped[] = [];

  for (const format of CORE_MODULE_IDS) {
    if (!input.formats.includes(format)) continue;
    const meta = getCoreModuleMeta(format);
    const compiled = MODULE_COMPILE[format](input.list, entries, input);
    skipped.push(...compiled.skipped);
    results.push({
      format,
      href: meta.href,
      label: meta.title,
      itemCount: compiled.itemCount,
      document: compiled.document,
    });
  }

  return { results, skipped };
}
