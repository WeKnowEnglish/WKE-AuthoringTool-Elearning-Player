import type { CoreModuleId } from "@/lib/activity-builder/core-modules/types";
import { exportCoreModuleToLessonPlayer } from "@/lib/activity-builder/core-modules/registry";
import type { VocabCompileFormat } from "@/lib/activity-builder/games/compile-from-vocab-list";
import { placeholderImageUrl } from "@/lib/activity-builder/games/authoring-shell";
import {
  createBlankGamesMcQuizDocument,
  makeMcOptions,
} from "@/lib/activity-builder/games/mc-options";
import {
  exportGamesMcQuizForLessonPlayer,
  validateGamesAuthoringDocument,
} from "@/lib/activity-builder/games/mc-quiz";
import {
  exportGamesLetterMixupForLessonPlayer,
  validateGamesLetterMixupAuthoringDocument,
} from "@/lib/activity-builder/games/letter-mixup";
import {
  exportGamesFlashcardsForLessonPlayer,
  validateGamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/flashcards";
import {
  exportGamesListenAndChooseForLessonPlayer,
  validateGamesListenAndChooseAuthoringDocument,
} from "@/lib/activity-builder/games/listen-and-choose";
import {
  exportGamesLineMatchForLessonPlayer,
  validateGamesLineMatchAuthoringDocument,
} from "@/lib/activity-builder/games/line-match";
import {
  exportGamesTrueFalseForLessonPlayer,
  validateGamesTrueFalseAuthoringDocument,
} from "@/lib/activity-builder/games/true-false";
import {
  exportGamesSentenceScrambleForLessonPlayer,
  validateGamesSentenceScrambleAuthoringDocument,
} from "@/lib/activity-builder/games/sentence-scramble";
import {
  exportGamesFillBlanksForLessonPlayer,
  validateGamesFillBlanksAuthoringDocument,
} from "@/lib/activity-builder/games/fill-blanks";
import type { GamesAuthoringDocument, GamesMcItem } from "@/lib/activity-builder/games/types-mc";
import type {
  GamesLetterMixupAuthoringDocument,
  GamesLetterMixupItem,
} from "@/lib/activity-builder/games/types-letter-mixup";
import type {
  GamesFlashcardCard,
  GamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/types-flashcards";
import type { GamesListenAndChooseAuthoringDocument } from "@/lib/activity-builder/games/types-listen-and-choose";
import type { GamesLineMatchAuthoringDocument } from "@/lib/activity-builder/games/types-line-match";
import type { GamesTrueFalseAuthoringDocument } from "@/lib/activity-builder/games/types-true-false";
import type { GamesSentenceScrambleAuthoringDocument } from "@/lib/activity-builder/games/types-sentence-scramble";
import type { GamesFillBlanksAuthoringDocument } from "@/lib/activity-builder/games/types-fill-blanks";
import type {
  GamesWordGameAuthoringDocument,
  GamesWordGameFormat,
  GamesWordGameItem,
} from "@/lib/activity-builder/games/types-word-games";
import {
  exportGamesWordGameForLessonPlayer,
  validateGamesWordGameAuthoringDocument,
} from "@/lib/activity-builder/games/word-games";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export type QuizSession =
  | { format: "multiple_choice"; document: GamesAuthoringDocument }
  | { format: "letter_mixup"; document: GamesLetterMixupAuthoringDocument }
  | { format: "flashcards"; document: GamesFlashcardsAuthoringDocument }
  | { format: "listen_and_choose"; document: GamesListenAndChooseAuthoringDocument }
  | { format: "line_match"; document: GamesLineMatchAuthoringDocument }
  | { format: "true_false"; document: GamesTrueFalseAuthoringDocument }
  | { format: "sentence_scramble"; document: GamesSentenceScrambleAuthoringDocument }
  | { format: "fill_blanks"; document: GamesFillBlanksAuthoringDocument }
  | { format: "wordsearch"; document: GamesWordGameAuthoringDocument }
  | { format: "crossword"; document: GamesWordGameAuthoringDocument }
  | { format: "memory"; document: GamesWordGameAuthoringDocument };

export const QUIZ_FORMATS: Array<{
  format: VocabCompileFormat;
  label: string;
  short: string;
  bankFormat: StudioActivityFormat;
  hint: string;
}> = [
  {
    format: "multiple_choice",
    label: "Multiple choice",
    short: "MCQ",
    bankFormat: "multiple_choice",
    hint: "Pick the right answer",
  },
  {
    format: "letter_mixup",
    label: "Letter scramble",
    short: "Letters",
    bankFormat: "letter_mixup",
    hint: "Rebuild the word",
  },
  {
    format: "flashcards",
    label: "Flashcards",
    short: "Cards",
    bankFormat: "flashcards",
    hint: "Flip to study",
  },
  {
    format: "listen_and_choose",
    label: "Listen and choose",
    short: "Listen",
    bankFormat: "listen_and_choose",
    hint: "Hear, then pick a picture",
  },
  {
    format: "line_match",
    label: "Line match",
    short: "Match",
    bankFormat: "line_match",
    hint: "Connect words to pictures",
  },
  {
    format: "true_false",
    label: "True / false",
    short: "T/F",
    bankFormat: "true_false",
    hint: "Judge each statement",
  },
  {
    format: "sentence_scramble",
    label: "Sentence scramble",
    short: "Scramble",
    bankFormat: "sentence_scramble",
    hint: "Put words in order",
  },
  {
    format: "fill_blanks",
    label: "Fill in the blanks",
    short: "Cloze",
    bankFormat: "fill_blanks",
    hint: "Choose the missing word",
  },
  {
    format: "wordsearch",
    label: "Word search",
    short: "Search",
    bankFormat: "wordsearch",
    hint: "Find words in a letter grid",
  },
  {
    format: "crossword",
    label: "Crossword",
    short: "Crossword",
    bankFormat: "crossword",
    hint: "Spell words from clues",
  },
  {
    format: "memory",
    label: "Memory",
    short: "Pairs",
    bankFormat: "memory",
    hint: "Match words to pictures or meanings",
  },
];

export function formatLabel(format: VocabCompileFormat): string {
  return QUIZ_FORMATS.find((row) => row.format === format)?.label ?? format;
}

export function newQuizId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function blankMcItem(question = "What is this?"): GamesMcItem {
  const options = makeMcOptions(["", "", "", ""]);
  return {
    id: newQuizId("q"),
    question,
    options,
    correctOptionId: options[0]!.id,
  };
}

export function blankLetterItem(): GamesLetterMixupItem {
  return { id: newQuizId("lm"), targetWord: "", imageUseTts: true };
}

export function blankFlashcard(): GamesFlashcardCard {
  return {
    id: newQuizId("fc"),
    faces: { word: "" },
    frontFaces: ["word"],
    backFaces: ["definition", "picture"],
  };
}

function blankListenItem() {
  const pad = placeholderImageUrl("?");
  return {
    id: newQuizId("listen"),
    dialogText: "",
    imageFit: "contain" as const,
    choices: [
      { id: "a", imageUrl: pad, label: "" },
      { id: "b", imageUrl: pad, label: "" },
      { id: "c", imageUrl: pad, label: "" },
    ],
    correctChoiceId: "a",
  };
}

function blankLineMatchScreen() {
  return {
    id: newQuizId("match"),
    tokens: [
      { id: "tok_a", label: "" },
      { id: "tok_b", label: "" },
    ],
    zones: [
      { id: "z_a", label: "", imageUrl: placeholderImageUrl("A") },
      { id: "z_b", label: "", imageUrl: placeholderImageUrl("B") },
    ],
    correctMap: { tok_a: "z_a", tok_b: "z_b" },
  };
}

function blankTrueFalseItem() {
  return {
    id: newQuizId("tf"),
    statement: "",
    correct: true,
  };
}

function blankSentenceItem() {
  return {
    id: newQuizId("ss"),
    correctOrder: ["", ""],
  };
}

function blankFillBlanksItem() {
  return {
    id: newQuizId("fb"),
    template: "This is a __1__.",
    blanks: [{ id: "1", acceptable: [""] }],
    wordBank: [""],
  };
}

export function blankWordGameItem(index = 1): GamesWordGameItem {
  return {
    id: newQuizId("word"),
    word: index === 1 ? "apple" : "banana",
    clue: index === 1 ? "A round fruit." : "A long yellow fruit.",
  };
}

function createBlankWordGameSession(format: GamesWordGameFormat): QuizSession {
  const id = newQuizId("quiz");
  const label = format === "wordsearch" ? "word search" : format;
  const promptDefault =
    format === "wordsearch"
      ? "Find every word in the grid."
      : format === "crossword"
        ? "Use the clues to complete the crossword."
        : "Match each word to its picture or meaning.";
  return {
    format,
    document: {
      version: 1,
      kind: "activity-authoring",
      id,
      name: `New ${label}`,
      educationalIntent: {
        objective: "Practice target vocabulary.",
        successCriteria: "Students complete the vocabulary activity.",
      },
      content: { instruction: promptDefault, completionMessage: "Great work!" },
      interaction: {
        type: "games",
        format,
        quizGroupId: id,
        quizGroupTitle: `New ${label}`,
        promptDefault,
        gridSize: 12,
        allowBackwards: false,
        memoryUsePictures: true,
        items: [blankWordGameItem(1), blankWordGameItem(2)],
      },
    },
  } as QuizSession;
}

export function createBlankSession(format: VocabCompileFormat): QuizSession {
  if (format === "wordsearch" || format === "crossword" || format === "memory") {
    return createBlankWordGameSession(format);
  }
  if (format === "letter_mixup") {
    const id = newQuizId("quiz");
    const item = blankLetterItem();
    return {
      format,
      document: {
        version: 1,
        kind: "activity-authoring",
        id,
        name: "New letter scramble",
        educationalIntent: {
          objective: "Spell target words.",
          successCriteria: "Students rebuild each word correctly.",
        },
        content: {
          instruction: "Unscramble the letters to spell the word.",
          completionMessage: "Great spelling!",
        },
        interaction: {
          type: "games",
          format: "letter_mixup",
          quizGroupId: id,
          quizGroupTitle: "New letter scramble",
          promptDefault: "Unscramble the letters to spell the word.",
          shuffleLettersDefault: true,
          caseSensitiveDefault: false,
          items: [item],
        },
      },
    };
  }
  if (format === "flashcards") {
    const id = newQuizId("quiz");
    const card = blankFlashcard();
    return {
      format,
      document: {
        version: 1,
        kind: "activity-authoring",
        id,
        name: "New flashcards",
        educationalIntent: {
          objective: "Study vocabulary with flip cards.",
          successCriteria: "Students flip through each card.",
        },
        content: {
          instruction: "Tap the card to flip.",
          completionMessage: "Nice studying!",
        },
        interaction: {
          type: "games",
          format: "flashcards",
          quizGroupId: id,
          quizGroupTitle: "New flashcards",
          shuffleCardsDefault: false,
          defaultFrontFaces: ["word"],
          defaultBackFaces: ["definition", "picture"],
          cards: [card],
        },
      },
    };
  }
  if (format === "listen_and_choose") {
    const id = newQuizId("quiz");
    return {
      format,
      document: {
        version: 1,
        kind: "activity-authoring",
        id,
        name: "New listen and choose",
        educationalIntent: {
          objective: "Listen and match pictures.",
          successCriteria: "Students choose the matching picture.",
        },
        content: {
          instruction: "Listen, then choose the picture.",
          completionMessage: "Great listening!",
        },
        interaction: {
          type: "games",
          format: "listen_and_choose",
          quizGroupId: id,
          quizGroupTitle: "New listen and choose",
          bodyTextDefault: "Listen, then choose the picture.",
          autoPlayDefault: true,
          shuffleChoicesDefault: true,
          items: [blankListenItem()],
        },
      },
    };
  }
  if (format === "line_match") {
    const id = newQuizId("quiz");
    return {
      format,
      document: {
        version: 1,
        kind: "activity-authoring",
        id,
        name: "New line match",
        educationalIntent: {
          objective: "Match words to pictures.",
          successCriteria: "Students connect every word correctly.",
        },
        content: {
          instruction: "Draw a line from each word to its picture.",
          completionMessage: "Nice matching!",
        },
        interaction: {
          type: "games",
          format: "line_match",
          quizGroupId: id,
          quizGroupTitle: "New line match",
          bodyTextDefault: "Draw a line from each word to its picture.",
          screens: [blankLineMatchScreen()],
        },
      },
    };
  }
  if (format === "true_false") {
    const id = newQuizId("quiz");
    return {
      format,
      document: {
        version: 1,
        kind: "activity-authoring",
        id,
        name: "New true / false",
        educationalIntent: {
          objective: "Judge true and false claims.",
          successCriteria: "Students answer each statement correctly.",
        },
        content: {
          instruction: "Is this true or false?",
          completionMessage: "Nice thinking!",
        },
        interaction: {
          type: "games",
          format: "true_false",
          quizGroupId: id,
          quizGroupTitle: "New true / false",
          items: [blankTrueFalseItem()],
        },
      },
    };
  }
  if (format === "sentence_scramble") {
    const id = newQuizId("quiz");
    return {
      format,
      document: {
        version: 1,
        kind: "activity-authoring",
        id,
        name: "New sentence scramble",
        educationalIntent: {
          objective: "Rebuild sentences.",
          successCriteria: "Students put words in the correct order.",
        },
        content: {
          instruction: "Put the words in order.",
          completionMessage: "Great sentences!",
        },
        interaction: {
          type: "games",
          format: "sentence_scramble",
          quizGroupId: id,
          quizGroupTitle: "New sentence scramble",
          bodyTextDefault: "Put the words in order.",
          items: [blankSentenceItem()],
        },
      },
    };
  }
  if (format === "fill_blanks") {
    const id = newQuizId("quiz");
    return {
      format,
      document: {
        version: 1,
        kind: "activity-authoring",
        id,
        name: "New fill in the blanks",
        educationalIntent: {
          objective: "Complete sentences with target words.",
          successCriteria: "Students choose the correct word for each blank.",
        },
        content: {
          instruction: "Choose the missing word.",
          completionMessage: "Nice work!",
        },
        interaction: {
          type: "games",
          format: "fill_blanks",
          quizGroupId: id,
          quizGroupTitle: "New fill in the blanks",
          bodyTextDefault: "Choose the missing word.",
          items: [blankFillBlanksItem()],
        },
      },
    };
  }

  const blank = createBlankGamesMcQuizDocument();
  blank.id = newQuizId("quiz");
  blank.interaction.quizGroupId = blank.id;
  blank.interaction.quizGroupTitle = blank.name;
  return { format: "multiple_choice", document: blank };
}

export function sessionItemIds(session: QuizSession): string[] {
  if (session.format === "flashcards") {
    return session.document.interaction.cards.map((card) => card.id);
  }
  if (session.format === "line_match") {
    return session.document.interaction.screens.map((screen) => screen.id);
  }
  return session.document.interaction.items.map((item) => item.id);
}

export function sessionItemCount(session: QuizSession): number {
  return sessionItemIds(session).length;
}

export function sessionName(session: QuizSession): string {
  return session.document.name;
}

export function mediaCoverage(session: QuizSession): { withImage: number; total: number } {
  if (session.format === "wordsearch" || session.format === "crossword") {
    return { withImage: 0, total: 0 };
  }
  if (session.format === "memory") {
    const items = session.document.interaction.items;
    return {
      total: items.length,
      withImage: items.filter((item) => Boolean(item.imageUrl?.trim())).length,
    };
  }
  if (session.format === "flashcards") {
    const cards = session.document.interaction.cards;
    return {
      total: cards.length,
      withImage: cards.filter((card) => Boolean(card.faces.pictureUrl?.trim())).length,
    };
  }
  if (session.format === "line_match") {
    const screens = session.document.interaction.screens;
    return {
      total: screens.length,
      withImage: screens.filter((screen) =>
        screen.zones.some((zone) => Boolean(zone.imageUrl?.trim())),
      ).length,
    };
  }
  if (session.format === "listen_and_choose") {
    const items = session.document.interaction.items;
    return {
      total: items.length,
      withImage: items.filter((item) =>
        item.choices.some((choice) => Boolean(choice.imageUrl?.trim())),
      ).length,
    };
  }
  if (
    session.format === "multiple_choice" ||
    session.format === "letter_mixup" ||
    session.format === "true_false" ||
    session.format === "sentence_scramble" ||
    session.format === "fill_blanks"
  ) {
    const items = session.document.interaction.items;
    return {
      total: items.length,
      withImage: items.filter((item) =>
        "imageUrl" in item ? Boolean(item.imageUrl?.trim()) : false,
      ).length,
    };
  }
  return { total: 0, withImage: 0 };
}

export function cloneSession(session: QuizSession): QuizSession {
  return structuredClone(session);
}

export function listEntryLabel(session: QuizSession, id: string, index: number): string {
  if (session.format === "flashcards") {
    const card = session.document.interaction.cards.find((row) => row.id === id);
    return card?.faces.word?.trim() || `Card ${index + 1}`;
  }
  if (session.format === "line_match") {
    const screen = session.document.interaction.screens.find((row) => row.id === id);
    const labels = screen?.tokens.map((token) => token.label.trim()).filter(Boolean) ?? [];
    return labels.join(" · ") || `Match ${index + 1}`;
  }
  if (session.format === "multiple_choice") {
    const item = session.document.interaction.items.find((row) => row.id === id);
    return item?.question.trim() || `Question ${index + 1}`;
  }
  if (session.format === "letter_mixup") {
    const item = session.document.interaction.items.find((row) => row.id === id);
    return item?.targetWord.trim() || `Word ${index + 1}`;
  }
  if (session.format === "listen_and_choose") {
    const item = session.document.interaction.items.find((row) => row.id === id);
    return item?.dialogText.trim() || `Listen ${index + 1}`;
  }
  if (session.format === "true_false") {
    const item = session.document.interaction.items.find((row) => row.id === id);
    const statement = item?.statement.trim() || "";
    return statement.length > 48 ? `${statement.slice(0, 48)}…` : statement || `T/F ${index + 1}`;
  }
  if (session.format === "sentence_scramble") {
    const item = session.document.interaction.items.find((row) => row.id === id);
    const joined = item?.correctOrder.map((token) => token.trim()).filter(Boolean).join(" ") ?? "";
    return joined || `Sentence ${index + 1}`;
  }
  if (
    session.format === "wordsearch" ||
    session.format === "crossword" ||
    session.format === "memory"
  ) {
    const item = session.document.interaction.items.find((row) => row.id === id);
    return item?.word.trim() || `Word ${index + 1}`;
  }
  const item = session.document.interaction.items.find((row) => row.id === id);
  return item?.template.trim() || `Cloze ${index + 1}`;
}

export function validateQuizSession(session: QuizSession): void {
  switch (session.format) {
    case "multiple_choice":
      validateGamesAuthoringDocument(session.document);
      return;
    case "letter_mixup":
      validateGamesLetterMixupAuthoringDocument(session.document);
      return;
    case "flashcards":
      validateGamesFlashcardsAuthoringDocument(session.document);
      return;
    case "listen_and_choose":
      validateGamesListenAndChooseAuthoringDocument(session.document);
      return;
    case "line_match":
      validateGamesLineMatchAuthoringDocument(session.document);
      return;
    case "true_false":
      validateGamesTrueFalseAuthoringDocument(session.document);
      return;
    case "sentence_scramble":
      validateGamesSentenceScrambleAuthoringDocument(session.document);
      return;
    case "fill_blanks":
      validateGamesFillBlanksAuthoringDocument(session.document);
      return;
    case "wordsearch":
    case "crossword":
    case "memory":
      validateGamesWordGameAuthoringDocument(session.document, session.format);
      return;
    default: {
      const _exhaustive: never = session;
      throw new Error(`Unsupported quiz format: ${(_exhaustive as QuizSession).format}`);
    }
  }
}

export function exportQuizSession(session: QuizSession): {
  pack: unknown;
  authoring: unknown;
  title: string;
  format: StudioActivityFormat;
} {
  const format = session.format as StudioActivityFormat;
  switch (session.format) {
    case "multiple_choice": {
      const valid = validateGamesAuthoringDocument(session.document);
      return {
        pack: exportGamesMcQuizForLessonPlayer(valid),
        authoring: valid,
        title: valid.name.trim() || "Untitled quiz",
        format,
      };
    }
    case "letter_mixup": {
      const valid = validateGamesLetterMixupAuthoringDocument(session.document);
      return {
        pack: exportGamesLetterMixupForLessonPlayer(valid),
        authoring: valid,
        title: valid.name.trim() || "Untitled letter scramble",
        format,
      };
    }
    case "flashcards": {
      const valid = validateGamesFlashcardsAuthoringDocument(session.document);
      return {
        pack: exportGamesFlashcardsForLessonPlayer(valid),
        authoring: valid,
        title: valid.name.trim() || "Untitled flashcards",
        format,
      };
    }
    case "listen_and_choose": {
      const valid = validateGamesListenAndChooseAuthoringDocument(session.document);
      return {
        pack: exportGamesListenAndChooseForLessonPlayer(valid),
        authoring: valid,
        title: valid.name.trim() || "Untitled listen and choose",
        format,
      };
    }
    case "line_match": {
      const valid = validateGamesLineMatchAuthoringDocument(session.document);
      return {
        pack: exportGamesLineMatchForLessonPlayer(valid),
        authoring: valid,
        title: valid.name.trim() || "Untitled line match",
        format,
      };
    }
    case "true_false": {
      const valid = validateGamesTrueFalseAuthoringDocument(session.document);
      return {
        pack: exportGamesTrueFalseForLessonPlayer(valid),
        authoring: valid,
        title: valid.name.trim() || "Untitled true / false",
        format,
      };
    }
    case "sentence_scramble": {
      const valid = validateGamesSentenceScrambleAuthoringDocument(session.document);
      return {
        pack: exportGamesSentenceScrambleForLessonPlayer(valid),
        authoring: valid,
        title: valid.name.trim() || "Untitled sentence scramble",
        format,
      };
    }
    case "fill_blanks": {
      const valid = validateGamesFillBlanksAuthoringDocument(session.document);
      return {
        pack: exportGamesFillBlanksForLessonPlayer(valid),
        authoring: valid,
        title: valid.name.trim() || "Untitled fill in the blanks",
        format,
      };
    }
    case "wordsearch":
    case "crossword":
    case "memory": {
      const valid = validateGamesWordGameAuthoringDocument(
        session.document,
        session.format,
      );
      return {
        pack: exportGamesWordGameForLessonPlayer(valid),
        authoring: valid,
        title: valid.name.trim() || `Untitled ${formatLabel(session.format).toLowerCase()}`,
        format,
      };
    }
    default: {
      const _exhaustive: never = session;
      throw new Error(`Unsupported quiz format: ${(_exhaustive as QuizSession).format}`);
    }
  }
}

export function sessionFromAuthoring(
  format: VocabCompileFormat,
  authoring: unknown,
): QuizSession {
  switch (format) {
    case "multiple_choice":
      return {
        format,
        document: validateGamesAuthoringDocument(authoring),
      };
    case "letter_mixup":
      return {
        format,
        document: validateGamesLetterMixupAuthoringDocument(authoring),
      };
    case "flashcards":
      return {
        format,
        document: validateGamesFlashcardsAuthoringDocument(authoring),
      };
    case "listen_and_choose":
      return {
        format,
        document: validateGamesListenAndChooseAuthoringDocument(authoring),
      };
    case "line_match":
      return {
        format,
        document: validateGamesLineMatchAuthoringDocument(authoring),
      };
    case "true_false":
      return {
        format,
        document: validateGamesTrueFalseAuthoringDocument(authoring),
      };
    case "sentence_scramble":
      return {
        format,
        document: validateGamesSentenceScrambleAuthoringDocument(authoring),
      };
    case "fill_blanks":
      return {
        format,
        document: validateGamesFillBlanksAuthoringDocument(authoring),
      };
    case "wordsearch":
    case "crossword":
    case "memory":
      return {
        format,
        document: validateGamesWordGameAuthoringDocument(authoring, format),
      };
    default: {
      const _exhaustive: never = format;
      throw new Error(`Unsupported quiz format: ${_exhaustive}`);
    }
  }
}

export function sessionFromCompileRow(row: {
  format: VocabCompileFormat;
  document: unknown;
}): QuizSession {
  return sessionFromAuthoring(row.format, row.document);
}

export function mergeQuizSessions(sessions: QuizSession[]): QuizSession {
  if (sessions.length === 0) throw new Error("Nothing to merge.");
  const formats = new Set(sessions.map((session) => session.format));
  if (formats.size > 1) {
    throw new Error(
      "One quiz needs every card to be the same format. Use separate quizzes for mixed formats.",
    );
  }
  const first = cloneSession(sessions[0]!);
  if (sessions.length === 1) return first;

  const listBits = sessions
    .map((session) => session.document.name.replace(/^[^·]+·\s*/, "").trim())
    .filter(Boolean);
  const uniqueLists = [...new Set(listBits)];
  const name =
    uniqueLists.length > 0
      ? `${formatLabel(first.format)} · ${uniqueLists.join(" + ")}`
      : `Combined ${formatLabel(first.format).toLowerCase()}`;

  first.document.name = name;
  first.document.interaction.quizGroupTitle = name;

  if (first.format === "flashcards") {
    first.document.interaction.cards = sessions.flatMap((session) =>
      session.format === "flashcards" ? session.document.interaction.cards : [],
    );
    return first;
  }
  if (first.format === "line_match") {
    first.document.interaction.screens = sessions.flatMap((session) =>
      session.format === "line_match" ? session.document.interaction.screens : [],
    );
    return first;
  }
  if (first.format === "multiple_choice") {
    first.document.interaction.items = sessions.flatMap((session) =>
      session.format === "multiple_choice" ? session.document.interaction.items : [],
    );
    return first;
  }
  if (first.format === "letter_mixup") {
    first.document.interaction.items = sessions.flatMap((session) =>
      session.format === "letter_mixup" ? session.document.interaction.items : [],
    );
    return first;
  }
  if (first.format === "listen_and_choose") {
    first.document.interaction.items = sessions.flatMap((session) =>
      session.format === "listen_and_choose" ? session.document.interaction.items : [],
    );
    return first;
  }
  if (first.format === "true_false") {
    first.document.interaction.items = sessions.flatMap((session) =>
      session.format === "true_false" ? session.document.interaction.items : [],
    );
    return first;
  }
  if (first.format === "sentence_scramble") {
    first.document.interaction.items = sessions.flatMap((session) =>
      session.format === "sentence_scramble" ? session.document.interaction.items : [],
    );
    return first;
  }
  if (
    first.format === "wordsearch" ||
    first.format === "crossword" ||
    first.format === "memory"
  ) {
    first.document.interaction.items = sessions.flatMap((session) =>
      session.format === first.format ? session.document.interaction.items : [],
    );
    return first;
  }
  first.document.interaction.items = sessions.flatMap((session) =>
    session.format === "fill_blanks" ? session.document.interaction.items : [],
  );
  return first;
}

export function appendBlankItem(session: QuizSession, masterPrompt?: string): {
  session: QuizSession;
  selectedItemId: string;
} {
  const next = cloneSession(session);
  if (next.format === "multiple_choice") {
    const item = blankMcItem(masterPrompt?.trim() || "What is this?");
    next.document.interaction.items = [...next.document.interaction.items, item];
    return { session: next, selectedItemId: item.id };
  }
  if (next.format === "letter_mixup") {
    const item = blankLetterItem();
    next.document.interaction.items = [...next.document.interaction.items, item];
    return { session: next, selectedItemId: item.id };
  }
  if (next.format === "flashcards") {
    const card = blankFlashcard();
    next.document.interaction.cards = [...next.document.interaction.cards, card];
    return { session: next, selectedItemId: card.id };
  }
  if (next.format === "listen_and_choose") {
    const item = blankListenItem();
    next.document.interaction.items = [...next.document.interaction.items, item];
    return { session: next, selectedItemId: item.id };
  }
  if (next.format === "line_match") {
    const screen = blankLineMatchScreen();
    next.document.interaction.screens = [...next.document.interaction.screens, screen];
    return { session: next, selectedItemId: screen.id };
  }
  if (next.format === "true_false") {
    const item = blankTrueFalseItem();
    next.document.interaction.items = [...next.document.interaction.items, item];
    return { session: next, selectedItemId: item.id };
  }
  if (next.format === "sentence_scramble") {
    const item = blankSentenceItem();
    next.document.interaction.items = [...next.document.interaction.items, item];
    return { session: next, selectedItemId: item.id };
  }
  if (
    next.format === "wordsearch" ||
    next.format === "crossword" ||
    next.format === "memory"
  ) {
    const item: GamesWordGameItem = {
      id: newQuizId("word"),
      word: "newword",
      clue: "Add a clue or definition.",
    };
    next.document.interaction.items = [...next.document.interaction.items, item];
    return { session: next, selectedItemId: item.id };
  }
  const item = blankFillBlanksItem();
  next.document.interaction.items = [...next.document.interaction.items, item];
  return { session: next, selectedItemId: item.id };
}

export function removeSessionItem(session: QuizSession, removeId: string): QuizSession {
  const next = cloneSession(session);
  switch (next.format) {
    case "flashcards":
      next.document.interaction.cards = next.document.interaction.cards.filter(
        (card) => card.id !== removeId,
      );
      return next;
    case "line_match":
      next.document.interaction.screens = next.document.interaction.screens.filter(
        (screen) => screen.id !== removeId,
      );
      return next;
    case "multiple_choice":
      next.document.interaction.items = next.document.interaction.items.filter(
        (item) => item.id !== removeId,
      );
      return next;
    case "letter_mixup":
      next.document.interaction.items = next.document.interaction.items.filter(
        (item) => item.id !== removeId,
      );
      return next;
    case "listen_and_choose":
      next.document.interaction.items = next.document.interaction.items.filter(
        (item) => item.id !== removeId,
      );
      return next;
    case "true_false":
      next.document.interaction.items = next.document.interaction.items.filter(
        (item) => item.id !== removeId,
      );
      return next;
    case "sentence_scramble":
      next.document.interaction.items = next.document.interaction.items.filter(
        (item) => item.id !== removeId,
      );
      return next;
    case "fill_blanks":
      next.document.interaction.items = next.document.interaction.items.filter(
        (item) => item.id !== removeId,
      );
      return next;
    case "wordsearch":
    case "crossword":
    case "memory":
      next.document.interaction.items = next.document.interaction.items.filter(
        (item) => item.id !== removeId,
      );
      return next;
    default: {
      const _exhaustive: never = next;
      throw new Error(`Unsupported quiz format: ${(_exhaustive as QuizSession).format}`);
    }
  }
}

/** Re-export for callers that export via registry after validate. */
export function exportValidatedCoreModule(
  id: CoreModuleId,
  document: QuizSession["document"],
): unknown {
  return exportCoreModuleToLessonPlayer(id, document);
}
