"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { VocabEntryAudioControls } from "@/components/teacher/activity-builder/VocabEntryAudioControls";
import {
  compileQuizzesFromVocabList,
  type VocabCompileFormat,
  type VocabCompileSkipped,
} from "@/lib/activity-builder/games/compile-from-vocab-list";
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
import type {
  GamesAuthoringDocument,
  GamesMcItem,
} from "@/lib/activity-builder/games/types-mc";
import type {
  GamesLetterMixupAuthoringDocument,
  GamesLetterMixupItem,
} from "@/lib/activity-builder/games/types-letter-mixup";
import type {
  GamesFlashcardCard,
  GamesFlashcardsAuthoringDocument,
} from "@/lib/activity-builder/games/types-flashcards";
import {
  getStudioVocabularyList,
  listStudioVocabularyLists,
  type StudioVocabularyListRef,
} from "@/lib/activity-library/vocabulary-list-studio";
import {
  QuizBuilderSetupCards,
  type StagedQuizCard,
} from "@/components/teacher/activity-builder/QuizBuilderSetupCards";
import { bankPathForStudioActivity } from "@/lib/studio-activities/paths";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

type Screen = "landing" | "editor";
type LandingPanel = "home" | "bank";

type QuizSession =
  | { format: "multiple_choice"; document: GamesAuthoringDocument }
  | { format: "letter_mixup"; document: GamesLetterMixupAuthoringDocument }
  | { format: "flashcards"; document: GamesFlashcardsAuthoringDocument };

type BankQuizRef = {
  id: string;
  title: string;
  format: StudioActivityFormat;
  updatedAt: string;
};

const QUIZ_FORMATS: Array<{
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
];

const BANNER_MS = 4000;
const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function createQuizCard(format: VocabCompileFormat): StagedQuizCard {
  return {
    id: newId("setup"),
    format,
    source: "vocab_list",
    listId: null,
    listName: null,
    entries: [],
    entriesBusy: false,
    selectedEntryIds: [],
    masterPrompt:
      format === "letter_mixup"
        ? "Unscramble the letters to spell the word."
        : format === "flashcards"
          ? ""
          : "What is this?",
    mcOptionCount: 4,
    mcShuffleOptions: true,
    letterShuffleLetters: true,
    letterCaseSensitive: false,
    flashcardsShuffleCards: true,
    flashcardsFrontFaces: ["picture"],
    flashcardsBackFaces: ["word", "example"],
  };
}

function isCardReady(card: StagedQuizCard): boolean {
  if (card.source === "blank") return true;
  return Boolean(card.listId) && card.selectedEntryIds.length > 0;
}

function blankMcItem(question = "What is this?"): GamesMcItem {
  const options = makeMcOptions(["", "", "", ""]);
  return {
    id: newId("q"),
    question,
    options,
    correctOptionId: options[0]!.id,
  };
}

function blankLetterItem(): GamesLetterMixupItem {
  return { id: newId("lm"), targetWord: "", imageUseTts: true };
}

function blankFlashcard(): GamesFlashcardCard {
  return {
    id: newId("fc"),
    faces: { word: "" },
    frontFaces: ["word"],
    backFaces: ["definition", "picture"],
  };
}

function createBlankSession(format: VocabCompileFormat): QuizSession {
  if (format === "letter_mixup") {
    const id = newId("quiz");
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
          type: "game",
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
    const id = newId("quiz");
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
          type: "game",
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
  const blank = createBlankGamesMcQuizDocument();
  blank.id = newId("quiz");
  blank.interaction.quizGroupId = blank.id;
  blank.interaction.quizGroupTitle = blank.name;
  return { format: "multiple_choice", document: blank };
}

function sessionItemIds(session: QuizSession): string[] {
  if (session.format === "flashcards") {
    return session.document.interaction.cards.map((card) => card.id);
  }
  return session.document.interaction.items.map((item) => item.id);
}

function sessionItemCount(session: QuizSession): number {
  return sessionItemIds(session).length;
}

function sessionName(session: QuizSession): string {
  return session.document.name;
}

function formatLabel(format: VocabCompileFormat): string {
  return QUIZ_FORMATS.find((row) => row.format === format)?.label ?? format;
}

function mediaCoverage(session: QuizSession): { withImage: number; total: number } {
  if (session.format === "multiple_choice") {
    const items = session.document.interaction.items;
    return {
      total: items.length,
      withImage: items.filter((item) => Boolean(item.imageUrl?.trim())).length,
    };
  }
  if (session.format === "letter_mixup") {
    const items = session.document.interaction.items;
    return {
      total: items.length,
      withImage: items.filter((item) => Boolean(item.imageUrl?.trim())).length,
    };
  }
  const cards = session.document.interaction.cards;
  return {
    total: cards.length,
    withImage: cards.filter((card) => Boolean(card.faces.pictureUrl?.trim())).length,
  };
}

function cloneSession(session: QuizSession): QuizSession {
  return structuredClone(session);
}

/** Merge same-format sessions into one activity (items/cards concatenated). */
function mergeQuizSessions(sessions: QuizSession[]): QuizSession {
  if (sessions.length === 0) {
    throw new Error("Nothing to merge.");
  }
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

  if (first.format === "flashcards") {
    const cards = sessions.flatMap((session) => {
      if (session.format !== "flashcards") return [];
      return session.document.interaction.cards;
    });
    first.document.name = name;
    first.document.interaction.quizGroupTitle = name;
    first.document.interaction.cards = cards;
    return first;
  }

  if (first.format === "letter_mixup") {
    const items = sessions.flatMap((session) => {
      if (session.format !== "letter_mixup") return [];
      return session.document.interaction.items;
    });
    first.document.name = name;
    first.document.interaction.quizGroupTitle = name;
    first.document.interaction.items = items;
    return first;
  }

  const items = sessions.flatMap((session) => {
    if (session.format !== "multiple_choice") return [];
    return session.document.interaction.items;
  });
  first.document.name = name;
  first.document.interaction.quizGroupTitle = name;
  first.document.interaction.items = items;
  return first;
}

export function QuizBuilderWorkspace() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [landingPanel, setLandingPanel] = useState<LandingPanel>("home");
  const [session, setSession] = useState<QuizSession>(() =>
    createBlankSession("multiple_choice"),
  );
  const [selectedItemId, setSelectedItemId] = useState(() =>
    sessionItemIds(createBlankSession("multiple_choice"))[0] ?? "",
  );
  const [setupCards, setSetupCards] = useState<StagedQuizCard[]>([]);
  const [batchDrafts, setBatchDrafts] = useState<QuizSession[]>([]);
  const [masterPrompt, setMasterPrompt] = useState("What is this?");
  const [letterPrompt, setLetterPrompt] = useState(
    "Unscramble the letters to spell the word.",
  );
  const [bankId, setBankId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<VocabCompileSkipped[]>([]);
  const [busy, setBusy] = useState(false);
  const [vocabLists, setVocabLists] = useState<StudioVocabularyListRef[]>([]);
  const [bankQuizzes, setBankQuizzes] = useState<BankQuizRef[]>([]);
  const [listsBusy, setListsBusy] = useState(false);
  const [bankBusy, setBankBusy] = useState(false);

  const readyCards = useMemo(
    () => setupCards.filter((card) => isCardReady(card)),
    [setupCards],
  );
  const canMergeOneQuiz = useMemo(() => {
    if (readyCards.length < 2) return false;
    const formats = new Set(readyCards.map((card) => card.format));
    return formats.size === 1;
  }, [readyCards]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (landingPanel !== "home") return;
    void refreshVocabLists();
    // Mount / return-home list refresh for setup cards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingPanel]);

  const patchSession = useCallback((updater: (current: QuizSession) => QuizSession) => {
    setSession((current) => updater(cloneSession(current)));
  }, []);

  const patchCard = useCallback((cardId: string, patch: Partial<StagedQuizCard>) => {
    setSetupCards((current) =>
      current.map((card) => (card.id === cardId ? { ...card, ...patch } : card)),
    );
  }, []);

  const addSetupCard = (format: VocabCompileFormat) => {
    setLandingPanel("home");
    setSetupCards((current) => [...current, createQuizCard(format)]);
  };

  const removeSetupCard = (cardId: string) => {
    setSetupCards((current) => current.filter((card) => card.id !== cardId));
  };

  const loadCardList = async (cardId: string, listId: string) => {
    patchCard(cardId, {
      listId,
      entriesBusy: true,
      entries: [],
      selectedEntryIds: [],
      listName: null,
    });
    try {
      const loaded = await getStudioVocabularyList(listId);
      const entries = loaded.document.entries;
      patchCard(cardId, {
        listId: loaded.id,
        listName: loaded.document.name,
        entries,
        selectedEntryIds: entries.map((entry) => entry.id),
        entriesBusy: false,
      });
    } catch (error) {
      patchCard(cardId, { entriesBusy: false, listId: null });
      setNotice(
        error instanceof Error ? error.message : "Could not load vocabulary list.",
      );
    }
  };

  const openEditor = (next: QuizSession, nextBankId: string | null) => {
    setSession(cloneSession(next));
    setSelectedItemId(sessionItemIds(next)[0] ?? "");
    setBankId(nextBankId);
    if (next.format === "multiple_choice") {
      setMasterPrompt(next.document.interaction.items[0]?.question ?? "What is this?");
    }
    if (next.format === "letter_mixup") {
      setLetterPrompt(next.document.interaction.promptDefault);
    }
    setScreen("editor");
    setLandingPanel("home");
  };

  const validation = useMemo(() => {
    try {
      if (session.format === "multiple_choice") {
        validateGamesAuthoringDocument(session.document);
      } else if (session.format === "letter_mixup") {
        validateGamesLetterMixupAuthoringDocument(session.document);
      } else {
        validateGamesFlashcardsAuthoringDocument(session.document);
      }
      return { ok: true as const, message: "Ready to save." };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Quiz is not valid.",
      };
    }
  }, [session]);

  const coverage = mediaCoverage(session);

  const refreshVocabLists = async () => {
    setListsBusy(true);
    try {
      setVocabLists(await listStudioVocabularyLists());
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not load vocabulary lists.",
      );
    } finally {
      setListsBusy(false);
    }
  };

  const refreshBankQuizzes = async () => {
    setBankBusy(true);
    try {
      const results = await Promise.all(
        QUIZ_FORMATS.map(async ({ bankFormat }) => {
          const response = await fetch(
            `/api/studio/activities?format=${bankFormat}&limit=50`,
            { method: "GET", credentials: "same-origin" },
          );
          const payload = (await response.json().catch(() => null)) as {
            ok?: boolean;
            activities?: Array<{
              id: string;
              title: string;
              format: StudioActivityFormat;
              updated_at: string;
            }>;
            error?: string;
          } | null;
          if (!response.ok || !payload?.ok || !Array.isArray(payload.activities)) {
            throw new Error(payload?.error || `Could not load ${bankFormat} quizzes.`);
          }
          return payload.activities.map((row) => ({
            id: row.id,
            title: row.title,
            format: row.format,
            updatedAt: row.updated_at,
          }));
        }),
      );
      setBankQuizzes(results.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load quizzes.");
    } finally {
      setBankBusy(false);
    }
  };

  const sessionFromCompileRow = (
    row: Awaited<ReturnType<typeof compileQuizzesFromVocabList>>["results"][number],
  ): QuizSession => {
    if (row.format === "multiple_choice") {
      return {
        format: "multiple_choice",
        document: validateGamesAuthoringDocument(row.document),
      };
    }
    if (row.format === "letter_mixup") {
      return {
        format: "letter_mixup",
        document: validateGamesLetterMixupAuthoringDocument(row.document),
      };
    }
    return {
      format: "flashcards",
      document: validateGamesFlashcardsAuthoringDocument(row.document),
    };
  };

  const generateBatch = async (mode: "separate" | "combined") => {
    if (readyCards.length === 0) {
      setNotice("Add a format card and choose a vocabulary list (or blank).");
      return;
    }
    if (mode === "combined") {
      const formats = new Set(readyCards.map((card) => card.format));
      if (formats.size > 1) {
        setNotice(
          "One quiz needs every card to be the same format (e.g. all MCQ). Mixed formats → use separate quizzes.",
        );
        return;
      }
    }
    setBusy(true);
    try {
      const generated: QuizSession[] = [];
      const allSkipped: VocabCompileSkipped[] = [];
      const listCache = new Map<
        string,
        Awaited<ReturnType<typeof getStudioVocabularyList>>
      >();

      for (const card of readyCards) {
        if (card.source === "blank") {
          const blank = createBlankSession(card.format);
          if (blank.format === "flashcards") {
            blank.document.interaction.defaultFrontFaces = [
              ...card.flashcardsFrontFaces,
            ];
            blank.document.interaction.defaultBackFaces = [
              ...card.flashcardsBackFaces,
            ];
            blank.document.interaction.cards =
              blank.document.interaction.cards.map((flashcard) => ({
                ...flashcard,
                frontFaces: [...card.flashcardsFrontFaces],
                backFaces: [...card.flashcardsBackFaces],
              }));
          }
          generated.push(blank);
          continue;
        }
        if (!card.listId) continue;
        let loaded = listCache.get(card.listId);
        if (!loaded) {
          loaded = await getStudioVocabularyList(card.listId);
          listCache.set(card.listId, loaded);
        }
        const compiled = compileQuizzesFromVocabList({
          list: loaded.document,
          selectedEntryIds: card.selectedEntryIds,
          formats: [card.format],
          mcMasterQuestion: card.masterPrompt || "What is this?",
          mcOptionCount: card.mcOptionCount,
          mcShuffleOptions: card.mcShuffleOptions,
          mcStableItems: true,
          letterPrompt:
            card.masterPrompt || "Unscramble the letters to spell the word.",
          letterShuffleLetters: card.letterShuffleLetters,
          letterCaseSensitive: card.letterCaseSensitive,
          flashcardsShuffleCards: card.flashcardsShuffleCards,
          flashcardsFrontFaces: card.flashcardsFrontFaces,
          flashcardsBackFaces: card.flashcardsBackFaces,
        });
        allSkipped.push(...compiled.skipped);
        const result = compiled.results[0];
        if (!result) {
          throw new Error(`Could not generate ${formatLabel(card.format)}.`);
        }
        const sessionNext = sessionFromCompileRow(result);
        if (card.listName) {
          const name = `${formatLabel(card.format)} · ${card.listName}`;
          sessionNext.document.name = name;
          sessionNext.document.interaction.quizGroupTitle = name;
        }
        generated.push(sessionNext);
      }

      if (generated.length === 0) {
        throw new Error("Nothing to generate.");
      }

      setSkipped(allSkipped);
      const skipNote =
        allSkipped.length > 0 ? ` · ${allSkipped.length} skipped` : "";

      if (mode === "combined") {
        const combined = mergeQuizSessions(generated);
        setBatchDrafts([]);
        openEditor(combined, null);
        setNotice(
          `Generated 1 combined ${formatLabel(combined.format).toLowerCase()} quiz · ${sessionItemCount(combined)} item${sessionItemCount(combined) === 1 ? "" : "s"}.${skipNote}`,
        );
        return;
      }

      const [first, ...rest] = generated;
      setBatchDrafts(rest);
      openEditor(first!, null);
      const labels = generated.map((item) => formatLabel(item.format)).join(", ");
      setNotice(
        rest.length > 0
          ? `Generated ${generated.length} quizzes (${labels}). Editing ${formatLabel(first!.format)}; others wait on Home.${skipNote}`
          : `Generated ${sessionItemCount(first!)} ${formatLabel(first!.format).toLowerCase()} item(s).${skipNote}`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not generate quiz.");
    } finally {
      setBusy(false);
    }
  };

  const openFromBank = async (activityId: string, format: StudioActivityFormat) => {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/studio/activities/${encodeURIComponent(activityId)}`,
        { method: "GET", credentials: "same-origin" },
      );
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        activity?: { id: string; format: string; authoring?: unknown };
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.activity) {
        throw new Error(payload?.error || "Could not open quiz.");
      }

      let next: QuizSession;
      if (format === "multiple_choice") {
        next = {
          format: "multiple_choice",
          document: validateGamesAuthoringDocument(payload.activity.authoring),
        };
      } else if (format === "letter_mixup") {
        next = {
          format: "letter_mixup",
          document: validateGamesLetterMixupAuthoringDocument(payload.activity.authoring),
        };
      } else if (format === "flashcards") {
        next = {
          format: "flashcards",
          document: validateGamesFlashcardsAuthoringDocument(payload.activity.authoring),
        };
      } else {
        throw new Error("Unsupported quiz format.");
      }

      setSkipped([]);
      openEditor(next, payload.activity.id);
      setNotice(`Opened “${sessionName(next)}” from Activity Bank.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open quiz.");
    } finally {
      setBusy(false);
    }
  };

  const saveToBank = async () => {
    setBusy(true);
    try {
      let pack: unknown;
      let authoring: unknown;
      let title: string;
      let format: StudioActivityFormat;

      if (session.format === "multiple_choice") {
        const valid = validateGamesAuthoringDocument(session.document);
        pack = exportGamesMcQuizForLessonPlayer(valid);
        authoring = valid;
        title = valid.name.trim() || "Untitled quiz";
        format = "multiple_choice";
      } else if (session.format === "letter_mixup") {
        const valid = validateGamesLetterMixupAuthoringDocument(session.document);
        pack = exportGamesLetterMixupForLessonPlayer(valid);
        authoring = valid;
        title = valid.name.trim() || "Untitled letter scramble";
        format = "letter_mixup";
      } else {
        const valid = validateGamesFlashcardsAuthoringDocument(session.document);
        pack = exportGamesFlashcardsForLessonPlayer(valid);
        authoring = valid;
        title = valid.name.trim() || "Untitled flashcards";
        format = "flashcards";
      }

      const response = await fetch("/api/studio/activities", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(bankId ? { id: bankId } : {}),
          format,
          pack,
          authoring,
          title,
          filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "quiz"}.lessonplayer.json`,
          source: { via: "quiz_builder" },
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.id) {
        throw new Error(payload?.error || "Could not save quiz.");
      }
      setBankId(payload.id);
      setNotice("Saved to Activity Bank.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save quiz.");
    } finally {
      setBusy(false);
    }
  };

  const addItem = () => {
    if (session.format === "multiple_choice") {
      const item = blankMcItem(masterPrompt.trim() || "What is this?");
      patchSession((current) => {
        if (current.format !== "multiple_choice") return current;
        return {
          ...current,
          document: {
            ...current.document,
            interaction: {
              ...current.document.interaction,
              items: [...current.document.interaction.items, item],
            },
          },
        };
      });
      setSelectedItemId(item.id);
      return;
    }
    if (session.format === "letter_mixup") {
      const item = blankLetterItem();
      patchSession((current) => {
        if (current.format !== "letter_mixup") return current;
        return {
          ...current,
          document: {
            ...current.document,
            interaction: {
              ...current.document.interaction,
              items: [...current.document.interaction.items, item],
            },
          },
        };
      });
      setSelectedItemId(item.id);
      return;
    }
    const card = blankFlashcard();
    patchSession((current) => {
      if (current.format !== "flashcards") return current;
      return {
        ...current,
        document: {
          ...current.document,
          interaction: {
            ...current.document.interaction,
            cards: [...current.document.interaction.cards, card],
          },
        },
      };
    });
    setSelectedItemId(card.id);
  };

  const removeSelected = () => {
    if (sessionItemCount(session) <= 1) return;
    const removeId = selectedItemId;
    patchSession((current) => {
      if (current.format === "flashcards") {
        const cards = current.document.interaction.cards.filter(
          (card) => card.id !== removeId,
        );
        setSelectedItemId(cards[0]?.id ?? "");
        return {
          ...current,
          document: {
            ...current.document,
            interaction: { ...current.document.interaction, cards },
          },
        };
      }
      const items = current.document.interaction.items.filter(
        (item) => item.id !== removeId,
      );
      setSelectedItemId(items[0]?.id ?? "");
      return {
        ...current,
        document: {
          ...current.document,
          interaction: { ...current.document.interaction, items },
        },
      };
    });
  };

  const renameQuiz = (name: string) => {
    patchSession((current) => ({
      ...current,
      document: {
        ...current.document,
        name,
        interaction: {
          ...current.document.interaction,
          quizGroupTitle: name || current.document.interaction.quizGroupTitle,
        },
      },
    }));
  };

  // ── Landing ────────────────────────────────────────────────────────
  if (screen === "landing") {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-stone-100 via-stone-50 to-amber-50/40">
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-stone-200/80 bg-white/90 px-4 py-3 backdrop-blur">
          <Link
            href="/teacher/activity-builder"
            className="text-sm text-stone-500 hover:text-stone-800"
          >
            ← Activity Builder
          </Link>
          <h1 className="text-base font-semibold text-stone-900">Quiz builder</h1>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              onClick={() => {
                setLandingPanel("bank");
                void refreshBankQuizzes();
              }}
            >
              Open from bank
            </button>
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:opacity-40"
              disabled={busy || readyCards.length === 0}
              title={
                readyCards.length <= 1
                  ? "Generate one quiz from the ready card"
                  : "Create a separate Activity Bank quiz for each card"
              }
              onClick={() => void generateBatch("separate")}
            >
              {busy
                ? "Generating…"
                : readyCards.length <= 1
                  ? "Generate quiz"
                  : `Separate · ${readyCards.length}`}
            </button>
            <button
              type="button"
              className="rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-40"
              disabled={busy || !canMergeOneQuiz}
              title={
                canMergeOneQuiz
                  ? "Merge every card into one quiz activity"
                  : readyCards.length < 2
                    ? "Add 2+ cards of the same format to merge"
                    : "One quiz needs every card to be the same format"
              }
              onClick={() => void generateBatch("combined")}
            >
              One quiz
            </button>
          </div>
        </header>

        {notice ? (
          <button
            type="button"
            className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950"
            onClick={() => setNotice(null)}
          >
            {notice} ×
          </button>
        ) : null}

        <div className="relative flex flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:px-6 sm:py-10">
          {busy ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-stone-50/70 backdrop-blur-[1px]">
              <p className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-600 shadow-sm">
                Working…
              </p>
            </div>
          ) : null}

          {landingPanel === "bank" ? (
            <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <button
                type="button"
                className="text-sm font-medium text-sky-800 hover:underline"
                onClick={() => setLandingPanel("home")}
              >
                ← Back
              </button>
              <h2 className="mt-3 text-xl font-semibold text-stone-900">
                Quizzes in Activity Bank
              </h2>
              <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                {bankBusy ? (
                  <li className="text-sm text-stone-500">Loading quizzes…</li>
                ) : bankQuizzes.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-sm text-stone-500">
                    No quizzes saved yet.
                  </li>
                ) : (
                  bankQuizzes.map((quiz) => (
                    <li key={quiz.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-left hover:border-amber-300 hover:bg-amber-50"
                        onClick={() => void openFromBank(quiz.id, quiz.format)}
                      >
                        <span className="font-semibold text-stone-900">{quiz.title}</span>
                        <span className="mt-1 text-xs capitalize text-stone-500">
                          {quiz.format.replaceAll("_", " ")}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : (
            <>
              <QuizBuilderSetupCards
                formats={QUIZ_FORMATS}
                cards={setupCards}
                vocabLists={vocabLists}
                listsBusy={listsBusy}
                onAdd={addSetupCard}
                onRemove={removeSetupCard}
                onPatch={patchCard}
                onLoadList={(cardId, listId) => void loadCardList(cardId, listId)}
              />

              {readyCards.length > 0 ? (
                <p className="mt-6 max-w-lg text-center text-xs text-stone-500">
                  {readyCards.length} ready
                  {canMergeOneQuiz
                    ? " · Separate = one activity each · One quiz = merge into a single activity"
                    : readyCards.length > 1
                      ? " · mixed formats → use Separate (One quiz needs the same format on every card)"
                      : " · each card keeps its own list and settings"}
                </p>
              ) : null}

              {batchDrafts.length > 0 ? (
                <div className="mt-8 w-full max-w-xl">
                  <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Waiting to edit
                  </p>
                  <div className="flex flex-col gap-2">
                    {batchDrafts.map((draft) => (
                      <button
                        key={`${draft.format}-${draft.document.id}`}
                        type="button"
                        className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-amber-300"
                        onClick={() => {
                          setBatchDrafts((current) =>
                            current.filter(
                              (item) => item.document.id !== draft.document.id,
                            ),
                          );
                          openEditor(draft, null);
                        }}
                      >
                        <span>
                          <span className="font-semibold text-stone-900">
                            {formatLabel(draft.format)}
                          </span>
                          <span className="ml-2 text-xs text-stone-500">
                            {sessionItemCount(draft)} item
                            {sessionItemCount(draft) === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-sky-800">Edit →</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Editor ─────────────────────────────────────────────────────────
  const listEntries =
    session.format === "flashcards"
      ? session.document.interaction.cards.map((card, index) => ({
          id: card.id,
          label: card.faces.word?.trim() || `Card ${index + 1}`,
        }))
      : session.document.interaction.items.map((item, index) => ({
          id: item.id,
          label:
            session.format === "multiple_choice"
              ? (item as GamesMcItem).question.trim() || `Question ${index + 1}`
              : (item as GamesLetterMixupItem).targetWord.trim() ||
                `Word ${index + 1}`,
        }));

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-stone-50">
      <header className="flex shrink-0 flex-wrap items-start gap-2 border-b border-stone-200 bg-white/70 px-3 py-2.5 sm:items-center sm:px-4">
        <Link
          href="/teacher/activity-builder"
          aria-label="Back to Activity Builder"
          className="mt-0.5 flex shrink-0 items-center justify-center rounded-lg p-1 text-sky-800 hover:bg-sky-50 sm:mt-0"
        >
          <svg viewBox="0 0 24 40" className="h-10 w-6" fill="currentColor" aria-hidden>
            <path d="M18 4 L6 20 L18 36 L22 32 L13 20 L22 8 Z" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1 basis-[16rem]">
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="Quiz name"
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-base font-semibold text-stone-900 outline-none hover:border-stone-200 focus:border-sky-300 focus:bg-white"
              value={sessionName(session)}
              onChange={(event) => renameQuiz(event.target.value)}
            />
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
              {bankId ? "In Activity Bank" : "Unsaved"}
            </span>
          </div>
          <p className="mt-0.5 px-1.5 text-xs text-stone-500">
            {sessionItemCount(session)} item
            {sessionItemCount(session) === 1 ? "" : "s"} · {formatLabel(session.format)} ·{" "}
            {coverage.withImage}/{coverage.total} with pictures
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800"
            onClick={() => {
              setScreen("landing");
              setLandingPanel("home");
            }}
          >
            Home
          </button>
          {bankId ? (
            <a
              href={bankPathForStudioActivity(bankId)}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800"
            >
              Bank
            </a>
          ) : null}
          <button
            type="button"
            className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            disabled={!validation.ok || busy}
            onClick={() => void saveToBank()}
          >
            {busy ? "Saving…" : "Save to bank"}
          </button>
        </div>
      </header>

      {notice ? (
        <button
          type="button"
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950"
          onClick={() => setNotice(null)}
        >
          {notice} ×
        </button>
      ) : null}

      {skipped.length > 0 ? (
        <div className="shrink-0 border-b border-stone-200 bg-stone-100 px-3 py-2 text-xs text-stone-700">
          <p className="font-semibold">
            Skipped {skipped.length} word{skipped.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-1 max-h-16 overflow-y-auto">
            {skipped.slice(0, 8).map((row) => (
              <li key={`${row.entryId}-${row.format}`}>
                {row.word || "(empty)"} — {row.reason}
              </li>
            ))}
            {skipped.length > 8 ? <li>…and {skipped.length - 8} more</li> : null}
          </ul>
        </div>
      ) : null}

      {coverage.total > 0 && coverage.withImage === 0 ? (
        <p className="shrink-0 border-b border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
          No pictures on these items yet. Add images on the vocabulary list and regenerate,
          or attach a picture on the selected item below.
        </p>
      ) : null}

      {!validation.ok ? (
        <p className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {validation.message}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-stone-200 bg-stone-50/50">
          <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              {session.format === "flashcards" ? "Cards" : "Questions"}
            </h2>
            <button
              type="button"
              className="rounded-lg bg-stone-900 px-2 py-1 text-xs font-medium text-white"
              onClick={addItem}
            >
              Add
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {listEntries.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedItemId(entry.id)}
                className={`w-full rounded-lg border p-3 text-left ${
                  selectedItemId === entry.id
                    ? "border-stone-900 bg-white"
                    : "border-stone-200 bg-white/70 hover:border-stone-400"
                }`}
              >
                <span className="text-xs text-stone-500">#{index + 1}</span>
                <span className="mt-1 block truncate text-sm font-semibold text-stone-900">
                  {entry.label}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-5xl">
            {session.format === "multiple_choice" ? (
              <McEditor
                document={session.document}
                selectedItemId={selectedItemId}
                masterPrompt={masterPrompt}
                setMasterPrompt={setMasterPrompt}
                onPatch={(next) =>
                  setSession({ format: "multiple_choice", document: next })
                }
                onRemove={removeSelected}
                canRemove={session.document.interaction.items.length > 1}
              />
            ) : null}
            {session.format === "letter_mixup" ? (
              <LetterEditor
                document={session.document}
                selectedItemId={selectedItemId}
                onPatch={(next) =>
                  setSession({ format: "letter_mixup", document: next })
                }
                onRemove={removeSelected}
                canRemove={session.document.interaction.items.length > 1}
              />
            ) : null}
            {session.format === "flashcards" ? (
              <FlashcardsEditor
                document={session.document}
                selectedItemId={selectedItemId}
                onPatch={(next) =>
                  setSession({ format: "flashcards", document: next })
                }
                onRemove={removeSelected}
                canRemove={session.document.interaction.cards.length > 1}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function McEditor({
  document,
  selectedItemId,
  masterPrompt,
  setMasterPrompt,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesAuthoringDocument;
  selectedItemId: string;
  masterPrompt: string;
  setMasterPrompt: (value: string) => void;
  onPatch: (next: GamesAuthoringDocument) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const selected =
    document.interaction.items.find((item) => item.id === selectedItemId) ?? null;

  const patchItem = (itemId: string, patch: Partial<GamesMcItem>) => {
    onPatch({
      ...document,
      interaction: {
        ...document.interaction,
        items: document.interaction.items.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
      },
    });
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-stone-200 bg-white/80 p-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
          Quiz settings
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-stone-800">
            Master question template
            <input
              className={inputClass}
              value={masterPrompt}
              onChange={(event) => setMasterPrompt(event.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
              onClick={() => {
                const prompt = masterPrompt.trim() || "What is this?";
                onPatch({
                  ...document,
                  interaction: {
                    ...document.interaction,
                    items: document.interaction.items.map((item) => ({
                      ...item,
                      question: prompt,
                    })),
                  },
                });
              }}
            >
              Apply template to all questions
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-800 sm:col-span-2">
            <input
              type="checkbox"
              checked={document.interaction.shuffleOptionsDefault}
              onChange={(event) =>
                onPatch({
                  ...document,
                  interaction: {
                    ...document.interaction,
                    shuffleOptionsDefault: event.target.checked,
                  },
                })
              }
            />
            Shuffle options by default
          </label>
        </div>
      </section>

      {selected ? (
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Selected question
            </h2>
            <button
              type="button"
              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
              disabled={!canRemove}
              onClick={onRemove}
            >
              Remove question
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 space-y-3">
              <label className="block text-sm text-stone-800">
                Question text
                <textarea
                  className={inputClass}
                  rows={2}
                  value={selected.question}
                  onChange={(event) =>
                    patchItem(selected.id, { question: event.target.value })
                  }
                />
              </label>
              <div className="space-y-2">
                <p className="text-sm font-medium text-stone-800">Options</p>
                {selected.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-2 text-sm text-stone-800"
                  >
                    <input
                      type="radio"
                      name={`correct-${selected.id}`}
                      checked={selected.correctOptionId === option.id}
                      onChange={() =>
                        patchItem(selected.id, { correctOptionId: option.id })
                      }
                    />
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
                      value={option.label}
                      onChange={(event) =>
                        patchItem(selected.id, {
                          options: selected.options.map((row) =>
                            row.id === option.id
                              ? { ...row, label: event.target.value }
                              : row,
                          ),
                        })
                      }
                    />
                    <span className="w-12 shrink-0 text-[10px] font-semibold uppercase text-stone-400">
                      {selected.correctOptionId === option.id ? "Correct" : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
                <MediaUrlControls
                  label="Picture"
                  compact
                  value={selected.imageUrl ?? ""}
                  libraryQueryHint={
                    selected.options.find((o) => o.id === selected.correctOptionId)
                      ?.label
                  }
                  uploadItemName={
                    selected.options.find((o) => o.id === selected.correctOptionId)
                      ?.label
                  }
                  onChange={(url) => {
                    const next = url.trim() || undefined;
                    patchItem(selected.id, {
                      imageUrl: next,
                      imageFit: next ? (selected.imageFit ?? "contain") : undefined,
                    });
                  }}
                  extraButtons={
                    selected.imageUrl ? (
                      <button
                        type="button"
                        className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
                        onClick={() =>
                          patchItem(selected.id, {
                            imageUrl: undefined,
                            imageFit: undefined,
                          })
                        }
                      >
                        Clear picture
                      </button>
                    ) : null
                  }
                />
                {selected.imageUrl?.trim() ? (
                  <label className="flex items-center gap-2 text-sm text-stone-800">
                    Image fit
                    <select
                      className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm"
                      value={selected.imageFit ?? "contain"}
                      onChange={(event) =>
                        patchItem(selected.id, {
                          imageFit: event.target.value as "cover" | "contain",
                        })
                      }
                    >
                      <option value="contain">Contain</option>
                      <option value="cover">Cover</option>
                    </select>
                  </label>
                ) : null}
              </div>
              <VocabEntryAudioControls
                value={selected.promptAudioUrl}
                libraryQueryHint={
                  selected.options.find((o) => o.id === selected.correctOptionId)?.label
                }
                uploadItemName={
                  selected.options.find((o) => o.id === selected.correctOptionId)?.label
                }
                onChange={(next) => patchItem(selected.id, { promptAudioUrl: next })}
              />
            </div>
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center text-sm text-stone-500">
          Select a question to edit.
        </p>
      )}
    </div>
  );
}

function LetterEditor({
  document,
  selectedItemId,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesLetterMixupAuthoringDocument;
  selectedItemId: string;
  onPatch: (next: GamesLetterMixupAuthoringDocument) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const selected =
    document.interaction.items.find((item) => item.id === selectedItemId) ?? null;

  const patchItem = (itemId: string, patch: Partial<GamesLetterMixupItem>) => {
    onPatch({
      ...document,
      interaction: {
        ...document.interaction,
        items: document.interaction.items.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
      },
    });
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-stone-200 bg-white/80 p-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
          Quiz settings
        </h2>
        <label className="block text-sm text-stone-800">
          Shared prompt
          <input
            className={inputClass}
            value={document.interaction.promptDefault}
            onChange={(event) =>
              onPatch({
                ...document,
                interaction: {
                  ...document.interaction,
                  promptDefault: event.target.value,
                },
                content: {
                  ...document.content,
                  instruction: event.target.value,
                },
              })
            }
          />
        </label>
        <div className="flex flex-wrap gap-4 text-sm text-stone-800">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={document.interaction.shuffleLettersDefault}
              onChange={(event) =>
                onPatch({
                  ...document,
                  interaction: {
                    ...document.interaction,
                    shuffleLettersDefault: event.target.checked,
                  },
                })
              }
            />
            Shuffle letters
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={document.interaction.caseSensitiveDefault}
              onChange={(event) =>
                onPatch({
                  ...document,
                  interaction: {
                    ...document.interaction,
                    caseSensitiveDefault: event.target.checked,
                  },
                })
              }
            />
            Case sensitive
          </label>
        </div>
      </section>

      {selected ? (
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Selected word
            </h2>
            <button
              type="button"
              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
              disabled={!canRemove}
              onClick={onRemove}
            >
              Remove word
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 space-y-3">
              <label className="block text-sm text-stone-800">
                Target word
                <input
                  className={inputClass}
                  value={selected.targetWord}
                  onChange={(event) =>
                    patchItem(selected.id, { targetWord: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm text-stone-800">
                Hint (optional)
                <input
                  className={inputClass}
                  value={selected.hint ?? ""}
                  onChange={(event) =>
                    patchItem(selected.id, {
                      hint: event.target.value || undefined,
                    })
                  }
                />
              </label>
            </div>
            <div className="min-w-0 space-y-3">
              <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
                <MediaUrlControls
                  label="Picture"
                  compact
                  value={selected.imageUrl ?? ""}
                  libraryQueryHint={selected.targetWord}
                  uploadItemName={selected.targetWord.trim() || undefined}
                  onChange={(url) => {
                    const next = url.trim() || undefined;
                    patchItem(selected.id, {
                      imageUrl: next,
                      imageFit: next ? (selected.imageFit ?? "contain") : undefined,
                    });
                  }}
                  extraButtons={
                    selected.imageUrl ? (
                      <button
                        type="button"
                        className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
                        onClick={() =>
                          patchItem(selected.id, {
                            imageUrl: undefined,
                            imageFit: undefined,
                          })
                        }
                      >
                        Clear picture
                      </button>
                    ) : null
                  }
                />
              </div>
              <VocabEntryAudioControls
                value={selected.imageAudioUrl}
                libraryQueryHint={selected.targetWord}
                uploadItemName={selected.targetWord.trim() || undefined}
                onChange={(next) =>
                  patchItem(selected.id, {
                    imageAudioUrl: next,
                    imageUseTts: !next,
                  })
                }
              />
            </div>
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center text-sm text-stone-500">
          Select a word to edit.
        </p>
      )}
    </div>
  );
}

function FlashcardsEditor({
  document,
  selectedItemId,
  onPatch,
  onRemove,
  canRemove,
}: {
  document: GamesFlashcardsAuthoringDocument;
  selectedItemId: string;
  onPatch: (next: GamesFlashcardsAuthoringDocument) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const selected =
    document.interaction.cards.find((card) => card.id === selectedItemId) ?? null;

  const patchCard = (cardId: string, patch: Partial<GamesFlashcardCard>) => {
    onPatch({
      ...document,
      interaction: {
        ...document.interaction,
        cards: document.interaction.cards.map((card) =>
          card.id === cardId ? { ...card, ...patch } : card,
        ),
      },
    });
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-stone-200 bg-white/80 p-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
          Deck settings
        </h2>
        <label className="flex items-center gap-2 text-sm text-stone-800">
          <input
            type="checkbox"
            checked={document.interaction.shuffleCardsDefault}
            onChange={(event) =>
              onPatch({
                ...document,
                interaction: {
                  ...document.interaction,
                  shuffleCardsDefault: event.target.checked,
                },
              })
            }
          />
          Shuffle cards
        </label>
      </section>

      {selected ? (
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Selected card
            </h2>
            <button
              type="button"
              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
              disabled={!canRemove}
              onClick={onRemove}
            >
              Remove card
            </button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 space-y-3">
              <label className="block text-sm text-stone-800">
                Word
                <input
                  className={inputClass}
                  value={selected.faces.word ?? ""}
                  onChange={(event) =>
                    patchCard(selected.id, {
                      faces: { ...selected.faces, word: event.target.value },
                    })
                  }
                />
              </label>
              <label className="block text-sm text-stone-800">
                Definition
                <textarea
                  className={inputClass}
                  rows={2}
                  value={selected.faces.definition ?? ""}
                  onChange={(event) =>
                    patchCard(selected.id, {
                      faces: {
                        ...selected.faces,
                        definition: event.target.value || undefined,
                      },
                    })
                  }
                />
              </label>
              <label className="block text-sm text-stone-800">
                Example
                <textarea
                  className={inputClass}
                  rows={2}
                  value={selected.faces.example ?? ""}
                  onChange={(event) =>
                    patchCard(selected.id, {
                      faces: {
                        ...selected.faces,
                        example: event.target.value || undefined,
                      },
                    })
                  }
                />
              </label>
            </div>
            <div className="min-w-0 space-y-3">
              <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
                <MediaUrlControls
                  label="Picture"
                  compact
                  value={selected.faces.pictureUrl ?? ""}
                  libraryQueryHint={selected.faces.word}
                  uploadItemName={selected.faces.word?.trim() || undefined}
                  onChange={(url) =>
                    patchCard(selected.id, {
                      faces: {
                        ...selected.faces,
                        pictureUrl: url.trim() || undefined,
                      },
                    })
                  }
                  extraButtons={
                    selected.faces.pictureUrl ? (
                      <button
                        type="button"
                        className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
                        onClick={() =>
                          patchCard(selected.id, {
                            faces: { ...selected.faces, pictureUrl: undefined },
                          })
                        }
                      >
                        Clear picture
                      </button>
                    ) : null
                  }
                />
              </div>
              <VocabEntryAudioControls
                value={selected.promptAudioUrl}
                libraryQueryHint={selected.faces.word}
                uploadItemName={selected.faces.word?.trim() || undefined}
                onChange={(next) => patchCard(selected.id, { promptAudioUrl: next })}
              />
            </div>
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center text-sm text-stone-500">
          Select a card to edit.
        </p>
      )}
    </div>
  );
}
