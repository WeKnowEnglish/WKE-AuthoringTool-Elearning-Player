"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  compileQuizzesFromVocabList,
  type VocabCompileFormat,
} from "@/lib/activity-builder/games/compile-from-vocab-list";
import { exportGamesMcQuizForLessonPlayer, validateGamesAuthoringDocument } from "@/lib/activity-builder/games/mc-quiz";
import type {
  GamesAuthoringDocument,
  GamesMcItem,
} from "@/lib/activity-builder/games/types-mc";
import {
  createBlankGamesMcQuizDocument,
  makeMcOptions,
} from "@/lib/activity-builder/games/mc-options";
import {
  getStudioVocabularyList,
  listStudioVocabularyLists,
  type StudioVocabularyListRef,
} from "@/lib/activity-library/vocabulary-list-studio";
import { bankPathForStudioActivity } from "@/lib/studio-activities/paths";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

type Screen = "landing" | "editor";
type LandingView = "chooser" | "bank" | "from-list";

type BankQuizRef = {
  id: string;
  title: string;
  format: StudioActivityFormat;
  updatedAt: string;
  playPath: string;
};

const QUIZ_FORMATS: Array<{
  format: VocabCompileFormat;
  label: string;
  bankFormat: StudioActivityFormat;
}> = [
  { format: "multiple_choice", label: "Multiple choice", bankFormat: "multiple_choice" },
  { format: "letter_mixup", label: "Letter scramble", bankFormat: "letter_mixup" },
  { format: "flashcards", label: "Flashcards", bankFormat: "flashcards" },
];

const BANNER_MS = 3000;
const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900";

function newItemId(): string {
  return `q-${crypto.randomUUID().slice(0, 8)}`;
}

function blankMcItem(question = "What is this?"): GamesMcItem {
  const options = makeMcOptions(["", "", "", ""]);
  return {
    id: newItemId(),
    question,
    options,
    correctOptionId: options[0]!.id,
  };
}

function cloneDoc(document: GamesAuthoringDocument): GamesAuthoringDocument {
  return structuredClone(document);
}

export function QuizBuilderWorkspace() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [landingView, setLandingView] = useState<LandingView>("chooser");
  const [document, setDocument] = useState(() =>
    cloneDoc(createBlankGamesMcQuizDocument()),
  );
  const [selectedItemId, setSelectedItemId] = useState(
    () => createBlankGamesMcQuizDocument().interaction.items[0]?.id ?? "",
  );
  const [masterPrompt, setMasterPrompt] = useState("What is this?");
  const [mcOptionCount, setMcOptionCount] = useState(4);
  const [bankId, setBankId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [vocabLists, setVocabLists] = useState<StudioVocabularyListRef[]>([]);
  const [bankQuizzes, setBankQuizzes] = useState<BankQuizRef[]>([]);
  const [listsBusy, setListsBusy] = useState(false);
  const [bankBusy, setBankBusy] = useState(false);

  const selectedItem =
    document.interaction.items.find((item) => item.id === selectedItemId) ??
    document.interaction.items[0] ??
    null;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const validation = useMemo(() => {
    try {
      validateGamesAuthoringDocument(document);
      return { ok: true as const, message: "Ready to save." };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Quiz is not valid.",
      };
    }
  }, [document]);

  const patchDocument = useCallback(
    (updater: (current: GamesAuthoringDocument) => GamesAuthoringDocument) => {
      setDocument((current) => updater(cloneDoc(current)));
    },
    [],
  );

  const openEditor = (next: GamesAuthoringDocument, nextBankId: string | null) => {
    setDocument(cloneDoc(next));
    setSelectedItemId(next.interaction.items[0]?.id ?? "");
    setBankId(nextBankId);
    setMasterPrompt(next.interaction.items[0]?.question ?? "What is this?");
    setScreen("editor");
    setLandingView("chooser");
  };

  const startBlank = () => {
    const blank = createBlankGamesMcQuizDocument();
    blank.id = `quiz-${crypto.randomUUID().slice(0, 8)}`;
    blank.interaction.quizGroupId = blank.id;
    blank.interaction.quizGroupTitle = blank.name;
    openEditor(blank, null);
    setNotice("Started a new multiple-choice quiz.");
  };

  const refreshVocabLists = async () => {
    setListsBusy(true);
    try {
      setVocabLists(await listStudioVocabularyLists());
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not load vocabulary lists.",
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
              playPath?: string;
            }>;
            error?: string;
          } | null;
          if (!response.ok || !payload?.ok || !Array.isArray(payload.activities)) {
            throw new Error(
              payload?.error || `Could not load ${bankFormat} quizzes.`,
            );
          }
          return payload.activities.map((row) => ({
            id: row.id,
            title: row.title,
            format: row.format,
            updatedAt: row.updated_at,
            playPath: row.playPath ?? `/pilots/games-mc-quiz?activity=${row.id}`,
          }));
        }),
      );
      setBankQuizzes(
        results
          .flat()
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not load quizzes.",
      );
    } finally {
      setBankBusy(false);
    }
  };

  const generateFromList = async (listId: string) => {
    setBusy(true);
    try {
      const loaded = await getStudioVocabularyList(listId);
      const compiled = compileQuizzesFromVocabList({
        list: loaded.document,
        formats: ["multiple_choice"],
        mcMasterQuestion: masterPrompt,
        mcOptionCount,
        mcShuffleOptions: true,
        mcStableItems: true,
      });
      const mc = compiled.results.find((row) => row.format === "multiple_choice");
      if (!mc || mc.document.interaction.format !== "multiple_choice") {
        throw new Error("Could not generate multiple-choice questions.");
      }
      const next = mc.document as GamesAuthoringDocument;
      openEditor(next, null);
      const skipped = compiled.skipped.length;
      setNotice(
        skipped > 0
          ? `Generated ${next.interaction.items.length} questions (${skipped} skipped).`
          : `Generated ${next.interaction.items.length} questions from “${loaded.document.name}”.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not generate quiz.",
      );
    } finally {
      setBusy(false);
    }
  };

  const openFromBank = async (activityId: string) => {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/studio/activities/${encodeURIComponent(activityId)}`,
        { method: "GET", credentials: "same-origin" },
      );
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        activity?: {
          id: string;
          format: string;
          authoring?: unknown;
        };
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.activity) {
        throw new Error(payload?.error || "Could not open quiz.");
      }
      if (payload.activity.format !== "multiple_choice") {
        throw new Error(
          "This MVP editor opens multiple-choice quizzes. Letter scramble and flashcards open from Activity Bank for now.",
        );
      }
      const next = validateGamesAuthoringDocument(payload.activity.authoring);
      openEditor(next, payload.activity.id);
      setNotice(`Opened “${next.name}” from Activity Bank.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open quiz.");
    } finally {
      setBusy(false);
    }
  };

  const saveToBank = async () => {
    setBusy(true);
    try {
      const valid = validateGamesAuthoringDocument(document);
      const pack = exportGamesMcQuizForLessonPlayer(valid);
      const title = valid.name.trim() || "Untitled quiz";
      const response = await fetch("/api/studio/activities", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(bankId ? { id: bankId } : {}),
          format: "multiple_choice",
          pack,
          authoring: valid,
          title,
          filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "quiz"}.lessonplayer.json`,
          source: { via: "quiz_builder" },
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        playPath?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.id) {
        throw new Error(payload?.error || "Could not save quiz.");
      }
      setBankId(payload.id);
      setNotice(
        `Saved to Activity Bank.${payload.playPath ? ` Play: ${payload.playPath}` : ""}`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save quiz.");
    } finally {
      setBusy(false);
    }
  };

  const applyMasterPromptToAll = () => {
    const prompt = masterPrompt.trim() || "What is this?";
    patchDocument((current) => ({
      ...current,
      interaction: {
        ...current.interaction,
        items: current.interaction.items.map((item) => ({
          ...item,
          question: prompt,
        })),
      },
    }));
    setNotice("Updated question text on all items.");
  };

  if (screen === "landing") {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-stone-100">
        <header className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
          <Link
            href="/teacher/activity-builder"
            className="text-sm text-stone-500 hover:text-stone-800"
          >
            ← Activity Builder
          </Link>
          <h1 className="text-base font-semibold text-stone-900">Quiz builder</h1>
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

        <div className="flex flex-1 flex-col items-center overflow-y-auto p-4 sm:p-8">
          <div className="relative w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            {busy ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80">
                <p className="text-sm font-medium text-stone-600">Working…</p>
              </div>
            ) : null}

            {landingView === "chooser" ? (
              <>
                <h2 className="text-xl font-semibold text-stone-900">
                  Build a quiz
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                  Generate questions from a vocabulary list, edit them here, then
                  save to Activity Bank. Multiple choice is ready now; other
                  formats stay available via legacy compile.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-left transition hover:border-amber-300 hover:bg-amber-50"
                    onClick={startBlank}
                  >
                    <p className="font-semibold text-stone-900">New blank quiz</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">
                      Start with one editable multiple-choice question.
                    </p>
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-left transition hover:border-amber-300 hover:bg-amber-50"
                    onClick={() => {
                      setLandingView("from-list");
                      void refreshVocabLists();
                    }}
                  >
                    <p className="font-semibold text-stone-900">From vocabulary list</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">
                      Auto-generate MC questions from a saved list.
                    </p>
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-left transition hover:border-amber-300 hover:bg-amber-50"
                    onClick={() => {
                      setLandingView("bank");
                      void refreshBankQuizzes();
                    }}
                  >
                    <p className="font-semibold text-stone-900">Open from bank</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">
                      Continue a quiz already in Activity Bank.
                    </p>
                  </button>
                </div>
              </>
            ) : null}

            {landingView === "from-list" ? (
              <>
                <button
                  type="button"
                  className="text-sm font-medium text-sky-800 hover:underline"
                  onClick={() => setLandingView("chooser")}
                >
                  ← Back
                </button>
                <h2 className="mt-3 text-xl font-semibold text-stone-900">
                  Choose a vocabulary list
                </h2>
                <label className="mt-4 block text-sm text-stone-800">
                  Master question template
                  <input
                    className={inputClass}
                    value={masterPrompt}
                    onChange={(event) => setMasterPrompt(event.target.value)}
                    placeholder="What is this?"
                  />
                </label>
                <label className="mt-3 block text-sm text-stone-800">
                  Options per question
                  <select
                    className={inputClass}
                    value={mcOptionCount}
                    onChange={(event) =>
                      setMcOptionCount(Number(event.target.value))
                    }
                  >
                    {[2, 3, 4, 5, 6].map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
                <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                  {listsBusy ? (
                    <li className="text-sm text-stone-500">Loading lists…</li>
                  ) : vocabLists.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-sm text-stone-500">
                      No vocabulary lists yet.{" "}
                      <Link
                        href="/teacher/activity-builder/vocabulary-lists"
                        className="font-semibold text-sky-800 underline"
                      >
                        Create one
                      </Link>
                      .
                    </li>
                  ) : (
                    vocabLists.map((list) => (
                      <li key={list.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-left hover:border-amber-300 hover:bg-amber-50"
                          onClick={() => void generateFromList(list.id)}
                        >
                          <span className="font-semibold text-stone-900">
                            {list.name}
                          </span>
                          <span className="text-xs text-stone-500">Generate →</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            ) : null}

            {landingView === "bank" ? (
              <>
                <button
                  type="button"
                  className="text-sm font-medium text-sky-800 hover:underline"
                  onClick={() => setLandingView("chooser")}
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
                          onClick={() => void openFromBank(quiz.id)}
                          disabled={quiz.format !== "multiple_choice"}
                        >
                          <span className="font-semibold text-stone-900">
                            {quiz.title}
                          </span>
                          <span className="mt-1 text-xs text-stone-500">
                            {quiz.format.replaceAll("_", " ")}
                            {quiz.format !== "multiple_choice"
                              ? " · open in Activity Bank for now"
                              : ""}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

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
              value={document.name}
              onChange={(event) =>
                patchDocument((current) => ({
                  ...current,
                  name: event.target.value,
                  interaction: {
                    ...current.interaction,
                    quizGroupTitle: event.target.value || current.interaction.quizGroupTitle,
                  },
                }))
              }
            />
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
              {bankId ? "In Activity Bank" : "Unsaved"}
            </span>
          </div>
          <p className="mt-0.5 px-1.5 text-xs text-stone-500">
            {document.interaction.items.length} question
            {document.interaction.items.length === 1 ? "" : "s"} · Multiple choice
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800"
            onClick={() => {
              setScreen("landing");
              setLandingView("chooser");
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

      {!validation.ok ? (
        <p className="shrink-0 border-b border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {validation.message}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-stone-200 bg-stone-50/50">
          <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Questions
            </h2>
            <button
              type="button"
              className="rounded-lg bg-stone-900 px-2 py-1 text-xs font-medium text-white"
              onClick={() => {
                const item = blankMcItem(masterPrompt.trim() || "What is this?");
                patchDocument((current) => ({
                  ...current,
                  interaction: {
                    ...current.interaction,
                    items: [...current.interaction.items, item],
                  },
                }));
                setSelectedItemId(item.id);
              }}
            >
              Add
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {document.interaction.items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className={`w-full rounded-lg border p-3 text-left ${
                  selectedItem?.id === item.id
                    ? "border-stone-900 bg-white"
                    : "border-stone-200 bg-white/70 hover:border-stone-400"
                }`}
              >
                <span className="text-xs text-stone-500">#{index + 1}</span>
                <span className="mt-1 block truncate text-sm font-semibold text-stone-900">
                  {item.question.trim() || "(empty question)"}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
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
                    onClick={applyMasterPromptToAll}
                  >
                    Apply template to all questions
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-stone-800 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={document.interaction.shuffleOptionsDefault}
                    onChange={(event) =>
                      patchDocument((current) => ({
                        ...current,
                        interaction: {
                          ...current.interaction,
                          shuffleOptionsDefault: event.target.checked,
                        },
                      }))
                    }
                  />
                  Shuffle options by default
                </label>
              </div>
            </section>

            {selectedItem ? (
              <section className="space-y-3 rounded-xl border border-stone-200 bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Selected question
                  </h2>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-800 disabled:opacity-40"
                    disabled={document.interaction.items.length <= 1}
                    onClick={() => {
                      const removeId = selectedItem.id;
                      patchDocument((current) => {
                        const items = current.interaction.items.filter(
                          (item) => item.id !== removeId,
                        );
                        setSelectedItemId(items[0]?.id ?? "");
                        return {
                          ...current,
                          interaction: { ...current.interaction, items },
                        };
                      });
                    }}
                  >
                    Remove question
                  </button>
                </div>
                <label className="block text-sm text-stone-800">
                  Question text
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={selectedItem.question}
                    onChange={(event) => {
                      const value = event.target.value;
                      patchDocument((current) => ({
                        ...current,
                        interaction: {
                          ...current.interaction,
                          items: current.interaction.items.map((item) =>
                            item.id === selectedItem.id
                              ? { ...item, question: value }
                              : item,
                          ),
                        },
                      }));
                    }}
                  />
                </label>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-stone-800">Options</p>
                  {selectedItem.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 text-sm text-stone-800"
                    >
                      <input
                        type="radio"
                        name={`correct-${selectedItem.id}`}
                        checked={selectedItem.correctOptionId === option.id}
                        onChange={() =>
                          patchDocument((current) => ({
                            ...current,
                            interaction: {
                              ...current.interaction,
                              items: current.interaction.items.map((item) =>
                                item.id === selectedItem.id
                                  ? { ...item, correctOptionId: option.id }
                                  : item,
                              ),
                            },
                          }))
                        }
                      />
                      <input
                        className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm"
                        value={option.label}
                        onChange={(event) => {
                          const value = event.target.value;
                          patchDocument((current) => ({
                            ...current,
                            interaction: {
                              ...current.interaction,
                              items: current.interaction.items.map((item) =>
                                item.id === selectedItem.id
                                  ? {
                                      ...item,
                                      options: item.options.map((row) =>
                                        row.id === option.id
                                          ? { ...row, label: value }
                                          : row,
                                      ),
                                    }
                                  : item,
                              ),
                            },
                          }));
                        }}
                      />
                      <span className="shrink-0 text-[10px] font-semibold uppercase text-stone-400">
                        {selectedItem.correctOptionId === option.id
                          ? "Correct"
                          : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ) : (
              <p className="rounded-xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center text-sm text-stone-500">
                Add a question to start editing.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
