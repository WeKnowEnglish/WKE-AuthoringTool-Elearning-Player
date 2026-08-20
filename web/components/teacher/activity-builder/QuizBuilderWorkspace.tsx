"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { VocabEntryAudioControls } from "@/components/teacher/activity-builder/VocabEntryAudioControls";
import {
  compileQuizzesFromVocabList,
  type VocabCompileFormat,
  type VocabCompileSkipped,
} from "@/lib/activity-builder/games/compile-from-vocab-list";
import { makeMcOptions } from "@/lib/activity-builder/games/mc-options";
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
import { vocabActivityGenerationRecipe } from "@/lib/activity-library/compile-quizzes-from-vocab-studio";
import {
  QuizBuilderSetupCards,
  isStagedQuizCardReady,
  type StagedQuizCard,
} from "@/components/teacher/activity-builder/QuizBuilderSetupCards";
import {
  FillBlanksEditor,
  LineMatchEditor,
  ListenEditor,
  SentenceScrambleEditor,
  TrueFalseEditor,
  WordGameEditor,
} from "@/components/teacher/activity-builder/QuizBuilderCoreFormatEditors";
import { bankPathForStudioActivity } from "@/lib/studio-activities/paths";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import { createPracticeTrackFromQuizCards } from "@/lib/activity-builder/games/quiz-builder-practice-track";
import { persistActivityTrackDraft } from "@/lib/activity-tracks";
import { enrichVocabListMediaFromLexicon } from "@/lib/actions/lexicon-media";
import { tokenizeSentenceForScramble } from "@/lib/games-sentence-scramble/scramble-tiles";
import {
  QUIZ_FORMATS,
  appendBlankItem,
  cloneSession,
  createBlankSession,
  exportQuizSession,
  formatLabel,
  listEntryLabel,
  mediaCoverage,
  mergeQuizSessions,
  newQuizId,
  removeSessionItem,
  sessionFromAuthoring,
  sessionFromCompileRow,
  sessionItemCount,
  sessionItemIds,
  sessionName,
  validateQuizSession,
  type QuizSession,
  blankFlashcard,
  blankLetterItem,
  blankMcItem,
} from "@/lib/activity-builder/games/quiz-builder-session";

type Screen = "landing" | "editor";
type LandingPanel = "home" | "bank";

type BankQuizRef = {
  id: string;
  title: string;
  format: StudioActivityFormat;
  updatedAt: string;
};

type GeneratedQuizDraft = {
  session: QuizSession;
  source: Record<string, unknown>;
};

const BANNER_MS = 4000;
const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900";

function newId(prefix: string): string {
  return newQuizId(prefix);
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
          : format === "listen_and_choose"
            ? "Listen, then choose the picture."
            : format === "line_match"
              ? "Draw a line from each word to its picture."
              : format === "sentence_scramble"
                ? "This is an example sentence."
                : format === "fill_blanks"
                  ? "Choose the missing word."
                  : format === "true_false"
                    ? "Is this true or false?"
                    : format === "wordsearch"
                      ? "Find every word in the grid."
                      : format === "crossword"
                        ? "Use the clues to complete the crossword."
                        : format === "memory"
                          ? "Match each word to its picture or meaning."
                    : "What is this?",
    mcOptionCount: 4,
    mcShuffleOptions: true,
    letterShuffleLetters: true,
    letterCaseSensitive: false,
    flashcardsShuffleCards: true,
    flashcardsFrontFaces: ["picture"],
    flashcardsBackFaces: ["word", "example"],
    wordSearchAllowBackwards: false,
    wordSearchAllowDiagonals: false,
    wordSearchAllowBackwardsDiagonals: false,
    memoryTextMode: "word",
    crosswordClueMode: "definition_or_example",
  };
}

export function QuizBuilderWorkspace({ initialActivityId = null }: { initialActivityId?: string | null }) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("landing");
  const [landingPanel, setLandingPanel] = useState<LandingPanel>("home");
  const [session, setSession] = useState<QuizSession>(() =>
    createBlankSession("multiple_choice"),
  );
  const [selectedItemId, setSelectedItemId] = useState(() =>
    sessionItemIds(createBlankSession("multiple_choice"))[0] ?? "",
  );
  const [setupCards, setSetupCards] = useState<StagedQuizCard[]>([]);
  const [batchDrafts, setBatchDrafts] = useState<GeneratedQuizDraft[]>([]);
  const [masterPrompt, setMasterPrompt] = useState("What is this?");
  const [letterPrompt, setLetterPrompt] = useState(
    "Unscramble the letters to spell the word.",
  );
  const [bankId, setBankId] = useState<string | null>(null);
  const [activitySource, setActivitySource] = useState<Record<string, unknown>>({ via: "quiz_builder" });
  const [notice, setNotice] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<VocabCompileSkipped[]>([]);
  const [busy, setBusy] = useState(false);
  const [vocabLists, setVocabLists] = useState<StudioVocabularyListRef[]>([]);
  const [bankQuizzes, setBankQuizzes] = useState<BankQuizRef[]>([]);
  const [listsBusy, setListsBusy] = useState(false);
  const [bankBusy, setBankBusy] = useState(false);

  const readyCards = useMemo(
    () => setupCards.filter((card) => isStagedQuizCardReady(card)),
    [setupCards],
  );
  const canRunOneQuiz = readyCards.length >= 2;
  const canMergeOneQuiz = useMemo(() => {
    if (!canRunOneQuiz) return false;
    const formats = new Set(readyCards.map((card) => card.format));
    return formats.size === 1;
  }, [canRunOneQuiz, readyCards]);
  const canBuildPracticeTrack = useMemo(() => {
    if (!canRunOneQuiz) return false;
    const formats = new Set(readyCards.map((card) => card.format));
    return formats.size > 1;
  }, [canRunOneQuiz, readyCards]);

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
      let document = loaded.document;
      try {
        document = await enrichVocabListMediaFromLexicon(document);
      } catch {
        // Linked-media enrichment is additive; directly authored list media still works.
      }
      const entries = document.entries;
      patchCard(cardId, {
        listId: loaded.id,
        listName: document.name,
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

  const openEditor = (
    next: QuizSession,
    nextBankId: string | null,
    nextSource: Record<string, unknown> = { via: "quiz_builder" },
  ) => {
    setSession(cloneSession(next));
    setSelectedItemId(sessionItemIds(next)[0] ?? "");
    setBankId(nextBankId);
    setActivitySource(nextSource);
    if (next.format === "multiple_choice") {
      setMasterPrompt(next.document.interaction.items[0]?.question ?? "What is this?");
    }
    if (next.format === "letter_mixup") {
      setLetterPrompt(next.document.interaction.promptDefault);
    }
    if (next.format === "listen_and_choose") {
      setMasterPrompt(next.document.interaction.bodyTextDefault);
    }
    if (next.format === "line_match") {
      setMasterPrompt(next.document.interaction.bodyTextDefault);
    }
    if (next.format === "sentence_scramble") {
      setMasterPrompt(
        next.document.interaction.items[0]?.correctOrder.join(" ") ?? "",
      );
    }
    if (next.format === "fill_blanks") {
      setMasterPrompt(next.document.interaction.bodyTextDefault);
    }
    if (next.format === "true_false") {
      setMasterPrompt("Is this true or false?");
    }
    if (
      next.format === "wordsearch" ||
      next.format === "crossword" ||
      next.format === "memory"
    ) {
      setMasterPrompt(next.document.interaction.promptDefault);
    }
    setScreen("editor");
    setLandingPanel("home");
  };

  const validation = useMemo(() => {
    try {
      validateQuizSession(session);
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

  const generateBatch = async (mode: "separate" | "combined") => {
    if (readyCards.length === 0) {
      setNotice("Add a format card and choose a vocabulary list (or blank).");
      return;
    }
    if (mode === "combined") {
      const formats = new Set(readyCards.map((card) => card.format));
      if (formats.size > 1) {
        setBusy(true);
        try {
          const track = createPracticeTrackFromQuizCards(readyCards);
          await persistActivityTrackDraft(track);
          setNotice(
            `Opened practice track with ${track.practiceComposition?.beats.length ?? 0} quizzes.`,
          );
          router.push(`/teacher/activity-builder/tracks/${track.id}`);
        } catch (error) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Could not create practice track.",
          );
        } finally {
          setBusy(false);
        }
        return;
      }
    }
    setBusy(true);
    try {
      const generated: GeneratedQuizDraft[] = [];
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
          if (blank.format === "memory") {
            blank.document.interaction.memoryTextMode = card.memoryTextMode;
          }
          if (blank.format === "crossword") {
            blank.document.interaction.crosswordClueMode = card.crosswordClueMode;
          }
          if (blank.format === "wordsearch") {
            blank.document.interaction.allowBackwards =
              card.wordSearchAllowBackwards;
            blank.document.interaction.allowDiagonals =
              card.wordSearchAllowDiagonals;
            blank.document.interaction.allowBackwardsDiagonals =
              card.wordSearchAllowBackwardsDiagonals;
          }
          if (blank.format === "sentence_scramble") {
            const authoredTokens = tokenizeSentenceForScramble(card.masterPrompt);
            blank.document.interaction.items = [
              {
                ...blank.document.interaction.items[0]!,
                promptMode: "scramble_only",
                correctOrder:
                  authoredTokens.length >= 2
                    ? authoredTokens
                    : ["Example", "sentence."],
              },
            ];
          }
          generated.push({ session: blank, source: { via: "quiz_builder" } });
          continue;
        }
        if (!card.listId) continue;
        let loaded = listCache.get(card.listId);
        if (!loaded) {
          loaded = await getStudioVocabularyList(card.listId);
          try {
            loaded = {
              ...loaded,
              document: await enrichVocabListMediaFromLexicon(loaded.document),
            };
          } catch {
            // Fall back to media stored directly on the vocabulary-list entries.
          }
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
          wordGamePrompt: card.masterPrompt || undefined,
          wordSearchAllowBackwards: card.wordSearchAllowBackwards,
          wordSearchAllowDiagonals: card.wordSearchAllowDiagonals,
          wordSearchAllowBackwardsDiagonals:
            card.wordSearchAllowBackwardsDiagonals,
          flashcardsShuffleCards: card.flashcardsShuffleCards,
          flashcardsFrontFaces: card.flashcardsFrontFaces,
          flashcardsBackFaces: card.flashcardsBackFaces,
          memoryTextMode: card.memoryTextMode,
          crosswordClueMode: card.crosswordClueMode,
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
        generated.push({
          session: sessionNext,
          source: {
            via: "quiz_builder",
            vocabListId: card.listId,
            generation: vocabActivityGenerationRecipe({
              vocabListId: card.listId,
              format: card.format,
              selectedEntryIds:
                card.selectedEntryIds.length === card.entries.length &&
                card.entries.every((entry) => card.selectedEntryIds.includes(entry.id))
                  ? undefined
                  : card.selectedEntryIds,
              settings: {
                mcMasterQuestion: card.masterPrompt || undefined,
                mcOptionCount: card.mcOptionCount,
                mcShuffleOptions: card.mcShuffleOptions,
                mcStableItems: true,
                letterPrompt: card.masterPrompt || undefined,
                letterShuffleLetters: card.letterShuffleLetters,
                letterCaseSensitive: card.letterCaseSensitive,
                wordGamePrompt: card.masterPrompt || undefined,
                wordSearchAllowBackwards: card.wordSearchAllowBackwards,
                wordSearchAllowDiagonals: card.wordSearchAllowDiagonals,
                wordSearchAllowBackwardsDiagonals:
                  card.wordSearchAllowBackwardsDiagonals,
                flashcardsShuffleCards: card.flashcardsShuffleCards,
                flashcardsFrontFaces: card.flashcardsFrontFaces,
                flashcardsBackFaces: card.flashcardsBackFaces,
                memoryTextMode: card.memoryTextMode,
                crosswordClueMode: card.crosswordClueMode,
              },
            }),
          },
        });
      }

      if (generated.length === 0) {
        throw new Error("Nothing to generate.");
      }

      setSkipped(allSkipped);
      const skipNote =
        allSkipped.length > 0 ? ` · ${allSkipped.length} skipped` : "";

      if (mode === "combined") {
        const combined = mergeQuizSessions(generated.map((draft) => draft.session));
        setBatchDrafts([]);
        openEditor(combined, null, { via: "quiz_builder", generationMode: "combined" });
        setNotice(
          `Generated 1 combined ${formatLabel(combined.format).toLowerCase()} quiz · ${sessionItemCount(combined)} item${sessionItemCount(combined) === 1 ? "" : "s"}.${skipNote}`,
        );
        return;
      }

      const [first, ...rest] = generated;
      setBatchDrafts(rest);
      openEditor(first!.session, null, first!.source);
      const labels = generated.map((item) => formatLabel(item.session.format)).join(", ");
      setNotice(
        rest.length > 0
          ? `Generated ${generated.length} quizzes (${labels}). Editing ${formatLabel(first!.session.format)}; others wait on Home.${skipNote}`
          : `Generated ${sessionItemCount(first!.session)} ${formatLabel(first!.session.format).toLowerCase()} item(s).${skipNote}`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not generate quiz.");
    } finally {
      setBusy(false);
    }
  };

  const openFromBank = async (activityId: string, format?: StudioActivityFormat) => {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/studio/activities/${encodeURIComponent(activityId)}`,
        { method: "GET", credentials: "same-origin" },
      );
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        format?: string;
        authoring?: unknown;
        source?: Record<string, unknown>;
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.id || !payload.format) {
        throw new Error(payload?.error || "Could not open quiz.");
      }

      const bankFormat = (format ?? payload.format) as VocabCompileFormat;
      if (!QUIZ_FORMATS.some((row) => row.format === bankFormat)) {
        throw new Error("Unsupported quiz format.");
      }
      const next = sessionFromAuthoring(bankFormat, payload.authoring);

      setSkipped([]);
      openEditor(next, payload.id, payload.source ?? { via: "quiz_builder" });
      setNotice(`Opened “${sessionName(next)}” from Activity Bank.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open quiz.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!initialActivityId) return;
    void openFromBank(initialActivityId);
    // Open the requested bank item once on entry; subsequent editing is local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialActivityId]);

  const saveToBank = async () => {
    setBusy(true);
    try {
      const { pack, authoring, title, format } = exportQuizSession(session);

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
          source: {
            ...activitySource,
            editedVia: "quiz_builder",
          },
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
    const { session: next, selectedItemId: nextId } = appendBlankItem(
      session,
      masterPrompt,
    );
    setSession(next);
    setSelectedItemId(nextId);
  };

  const removeSelected = () => {
    if (sessionItemCount(session) <= 1) return;
    const next = removeSessionItem(session, selectedItemId);
    setSession(next);
    setSelectedItemId(sessionItemIds(next)[0] ?? "");
  };

  const renameQuiz = (name: string) => {
    patchSession((current) => {
      const next = cloneSession(current);
      next.document.name = name;
      next.document.interaction.quizGroupTitle =
        name || next.document.interaction.quizGroupTitle;
      return next;
    });
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
              disabled={busy || !canRunOneQuiz}
              title={
                canMergeOneQuiz
                  ? "Merge every card into one quiz activity"
                  : canBuildPracticeTrack
                    ? "Create a practice track with one beat per format"
                    : "Add 2+ ready cards to merge or build a practice track"
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
                    : canBuildPracticeTrack
                      ? " · mixed formats → One quiz opens a practice track (one beat per card)"
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
                        key={`${draft.session.format}-${draft.session.document.id}`}
                        type="button"
                        className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-amber-300"
                        onClick={() => {
                          setBatchDrafts((current) =>
                            current.filter(
                              (item) => item.session.document.id !== draft.session.document.id,
                            ),
                          );
                          openEditor(draft.session, null, draft.source);
                        }}
                      >
                        <span>
                          <span className="font-semibold text-stone-900">
                            {formatLabel(draft.session.format)}
                          </span>
                          <span className="ml-2 text-xs text-stone-500">
                            {sessionItemCount(draft.session)} item
                            {sessionItemCount(draft.session) === 1 ? "" : "s"}
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
  const listEntries = sessionItemIds(session).map((id, index) => ({
    id,
    label: listEntryLabel(session, id, index),
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
              {session.format === "flashcards"
                ? "Cards"
                : session.format === "wordsearch" || session.format === "crossword" || session.format === "memory"
                  ? "Words"
                  : "Questions"}
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
            {session.format === "listen_and_choose" ? (
              <ListenEditor
                document={session.document}
                selectedItemId={selectedItemId}
                onPatch={(next) =>
                  setSession({ format: "listen_and_choose", document: next })
                }
                onRemove={removeSelected}
                canRemove={session.document.interaction.items.length > 1}
              />
            ) : null}
            {session.format === "line_match" ? (
              <LineMatchEditor
                document={session.document}
                selectedItemId={selectedItemId}
                onPatch={(next) =>
                  setSession({ format: "line_match", document: next })
                }
                onRemove={removeSelected}
                canRemove={session.document.interaction.screens.length > 1}
              />
            ) : null}
            {session.format === "true_false" ? (
              <TrueFalseEditor
                document={session.document}
                selectedItemId={selectedItemId}
                onPatch={(next) =>
                  setSession({ format: "true_false", document: next })
                }
                onRemove={removeSelected}
                canRemove={session.document.interaction.items.length > 1}
              />
            ) : null}
            {session.format === "sentence_scramble" ? (
              <SentenceScrambleEditor
                document={session.document}
                selectedItemId={selectedItemId}
                onPatch={(next) =>
                  setSession({ format: "sentence_scramble", document: next })
                }
                onRemove={removeSelected}
                canRemove={session.document.interaction.items.length > 1}
              />
            ) : null}
            {session.format === "fill_blanks" ? (
              <FillBlanksEditor
                document={session.document}
                selectedItemId={selectedItemId}
                onPatch={(next) =>
                  setSession({ format: "fill_blanks", document: next })
                }
                onRemove={removeSelected}
                canRemove={session.document.interaction.items.length > 1}
              />
            ) : null}
            {session.format === "wordsearch" || session.format === "crossword" || session.format === "memory" ? (
              <WordGameEditor
                document={session.document}
                selectedItemId={selectedItemId}
                onPatch={(next) => setSession({ format: session.format, document: next } as QuizSession)}
                onRemove={removeSelected}
                canRemove={session.document.interaction.items.length > 2}
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
              <div className="space-y-3">
                <VocabEntryAudioControls
                  label="Word audio"
                  value={selected.promptAudioUrl}
                  libraryQueryHint={selected.faces.word}
                  uploadItemName={selected.faces.word?.trim() || undefined}
                  onChange={(next) =>
                    patchCard(selected.id, { promptAudioUrl: next })
                  }
                />
                <VocabEntryAudioControls
                  label="Example audio"
                  value={selected.exampleAudioUrl}
                  libraryQueryHint={
                    selected.faces.example?.trim() || selected.faces.word
                  }
                  uploadItemName={
                    selected.faces.example?.trim() ||
                    selected.faces.word?.trim() ||
                    undefined
                  }
                  onChange={(next) =>
                    patchCard(selected.id, { exampleAudioUrl: next })
                  }
                />
                <VocabEntryAudioControls
                  label="Definition audio"
                  value={selected.definitionAudioUrl}
                  libraryQueryHint={
                    selected.faces.definition?.trim() || selected.faces.word
                  }
                  uploadItemName={
                    selected.faces.definition?.trim() ||
                    selected.faces.word?.trim() ||
                    undefined
                  }
                  onChange={(next) =>
                    patchCard(selected.id, { definitionAudioUrl: next })
                  }
                />
              </div>
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
