"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  loadSavedPackQuiz,
  regeneratePackQuiz,
  updatePackQuiz,
} from "@/lib/actions/pack-quiz";
import {
  getPackQuizFormatMeta,
  packQuizFormatReadiness,
  packQuizQuestionsToLetterSheetRows,
  packQuizQuestionsToSentenceSheetRows,
  packQuizQuestionsToSheetRows,
  packQuizQuestionsToTfSheetRows,
  sheetLetterRowsToPackQuizQuestions,
  sheetRowsToPackQuizQuestions,
  sheetSentenceRowsToPackQuizQuestions,
  sheetTfRowsToPackQuizQuestions,
  type PackQuizFormat,
  type PackQuizLetterSheetRow,
  type PackQuizSentenceSheetRow,
  type PackQuizSheetRow,
  type PackQuizTfSheetRow,
} from "@/lib/vocabulary/pack-quiz";
import { PackQuizLetterSheetTable } from "@/components/teacher/word-packs/PackQuizLetterSheetTable";
import { PackQuizSentenceSheetTable } from "@/components/teacher/word-packs/PackQuizSentenceSheetTable";
import { PackQuizSheetTable } from "@/components/teacher/word-packs/PackQuizSheetTable";
import { PackQuizTfSheetTable } from "@/components/teacher/word-packs/PackQuizTfSheetTable";

type Props = {
  open: boolean;
  onClose: () => void;
  quizId: string;
  quizTitle: string;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function PackQuizEditorOverlay({ open, onClose, quizId, quizTitle }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [title, setTitle] = useState(quizTitle);
  const [format, setFormat] = useState<PackQuizFormat | null>(null);
  const [formatLabel, setFormatLabel] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mcRows, setMcRows] = useState<PackQuizSheetRow[]>([]);
  const [tfRows, setTfRows] = useState<PackQuizTfSheetRow[]>([]);
  const [letterRows, setLetterRows] = useState<PackQuizLetterSheetRow[]>([]);
  const [sentenceRows, setSentenceRows] = useState<PackQuizSentenceSheetRow[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [homeworkSynced, setHomeworkSynced] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({
    title: quizTitle,
    format: null as PackQuizFormat | null,
    mcRows: [] as PackQuizSheetRow[],
    tfRows: [] as PackQuizTfSheetRow[],
    letterRows: [] as PackQuizLetterSheetRow[],
    sentenceRows: [] as PackQuizSentenceSheetRow[],
  });
  latestRef.current = { title, format, mcRows, tfRows, letterRows, sentenceRows };

  const questionCount =
    format === "true_false"
      ? tfRows.length
      : format === "letter_scramble"
        ? letterRows.length
        : format === "sentence_scramble"
          ? sentenceRows.length
          : mcRows.length;
  const canRegenerate =
    format != null && packQuizFormatReadiness(format, wordCount).ok;

  function applyQuizRows(quizFormat: PackQuizFormat, questions: Parameters<
    typeof packQuizQuestionsToSheetRows
  >[0]) {
    if (quizFormat === "true_false") {
      setTfRows(packQuizQuestionsToTfSheetRows(questions));
      setMcRows([]);
      setLetterRows([]);
      setSentenceRows([]);
    } else if (quizFormat === "letter_scramble") {
      setLetterRows(packQuizQuestionsToLetterSheetRows(questions));
      setMcRows([]);
      setTfRows([]);
      setSentenceRows([]);
    } else if (quizFormat === "sentence_scramble") {
      setSentenceRows(packQuizQuestionsToSentenceSheetRows(questions));
      setMcRows([]);
      setTfRows([]);
      setLetterRows([]);
    } else {
      setMcRows(packQuizQuestionsToSheetRows(questions));
      setTfRows([]);
      setLetterRows([]);
      setSentenceRows([]);
    }
  }

  useEffect(() => {
    if (!open || !quizId) return;
    setLoading(true);
    setError(null);
    setMcRows([]);
    setTfRows([]);
    setLetterRows([]);
    setSentenceRows([]);
    setFormat(null);
    setTitle(quizTitle);
    setSaveState("idle");
    setSaveError(null);
    setHomeworkSynced(null);
    dirtyRef.current = false;
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);

    void loadSavedPackQuiz(quizId).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const quiz = result.quiz;
      setTitle(quiz.title);
      setFormat(quiz.format);
      setFormatLabel(getPackQuizFormatMeta(quiz.format).label);
      setWordCount(quiz.word_ids.length);
      applyQuizRows(quiz.format, quiz.questions);
      setSaveState("saved");
    });

    return () => {
      window.clearTimeout(t);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [open, quizId, quizTitle]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Shared media library portal (z-200) should close first, not the quiz editor.
        if (document.querySelector('[aria-label="Media library"]')) return;
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  async function persist() {
    if (!dirtyRef.current || savingRef.current) return;
    const payload = latestRef.current;
    const built =
      payload.format === "true_false"
        ? sheetTfRowsToPackQuizQuestions(payload.tfRows)
        : payload.format === "letter_scramble"
          ? sheetLetterRowsToPackQuizQuestions(payload.letterRows)
          : payload.format === "sentence_scramble"
            ? sheetSentenceRowsToPackQuizQuestions(payload.sentenceRows)
            : sheetRowsToPackQuizQuestions(payload.mcRows);
    if (!built.ok) {
      setSaveState("error");
      setSaveError(built.error);
      return;
    }

    dirtyRef.current = false;
    savingRef.current = true;
    setSaveState("saving");
    setSaveError(null);
    try {
      const result = await updatePackQuiz({
        quizId,
        title: payload.title,
        questions: built.questions,
      });
      if (!result.ok) {
        dirtyRef.current = true;
        setSaveState("error");
        setSaveError(result.error);
        return;
      }
      setHomeworkSynced(result.homeworkSynced);
      setSaveState(dirtyRef.current ? "dirty" : "saved");
    } catch (err) {
      dirtyRef.current = true;
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      savingRef.current = false;
      if (dirtyRef.current) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          void persist();
        }, 400);
      }
    }
  }

  function markDirty() {
    dirtyRef.current = true;
    setSaveState("dirty");
    setSaveError(null);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persist();
    }, 650);
  }

  function onChangeMcRow(
    id: string,
    patch: Partial<
      Pick<PackQuizSheetRow, "mode" | "prompt" | "promptImageUrl" | "correct" | "wrongs">
    >,
  ) {
    setMcRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    markDirty();
  }

  function onChangeTfRow(
    id: string,
    patch: Partial<
      Pick<PackQuizTfSheetRow, "statement" | "correct" | "promptImageUrl" | "truthStatement">
    >,
  ) {
    setTfRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    markDirty();
  }

  function onChangeLetterRow(
    id: string,
    patch: Partial<
      Pick<PackQuizLetterSheetRow, "prompt" | "targetWord" | "promptImageUrl" | "extraAccepted">
    >,
  ) {
    setLetterRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    markDirty();
  }

  function onChangeSentenceRow(
    id: string,
    patch: Partial<
      Pick<PackQuizSentenceSheetRow, "sentence" | "bodyText" | "promptImageUrl">
    >,
  ) {
    setSentenceRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    markDirty();
  }

  function onDeleteMcRow(id: string) {
    setMcRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
    markDirty();
  }

  function onDeleteTfRow(id: string) {
    setTfRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
    markDirty();
  }

  function onDeleteLetterRow(id: string) {
    setLetterRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
    markDirty();
  }

  function onDeleteSentenceRow(id: string) {
    setSentenceRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
    markDirty();
  }

  async function onRegenerate() {
    if (regenerating || savingRef.current) return;
    if (
      !window.confirm(
        "Regenerate all questions from the frozen word list? Your sheet edits will be replaced.",
      )
    ) {
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    dirtyRef.current = false;
    setRegenerating(true);
    setSaveError(null);
    try {
      const result = await regeneratePackQuiz(quizId);
      if (!result.ok) {
        setSaveState("error");
        setSaveError(result.error);
        return;
      }
      setTitle(result.quiz.title);
      setFormat(result.quiz.format);
      setWordCount(result.quiz.word_ids.length);
      applyQuizRows(result.quiz.format, result.quiz.questions);
      setHomeworkSynced(result.homeworkSynced);
      setSaveState("saved");
    } finally {
      setRegenerating(false);
    }
  }

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (formatLabel) parts.push(formatLabel);
    parts.push(`${questionCount} question${questionCount === 1 ? "" : "s"}`);
    if (wordCount > 0) {
      parts.push(`${wordCount} word${wordCount === 1 ? "" : "s"} frozen`);
    }
    return parts.join(" · ");
  }, [formatLabel, questionCount, wordCount]);

  function saveStatusLabel(): string {
    if (saveState === "saving" || regenerating) return regenerating ? "Regenerating…" : "Saving…";
    if (saveState === "dirty") return "Unsaved changes…";
    if (saveState === "error") return saveError ?? "Save failed";
    if (saveState === "saved") {
      const hw =
        homeworkSynced != null && homeworkSynced > 0
          ? ` · synced ${homeworkSynced} homework`
          : "";
      return `Saved${hw}`;
    }
    return "";
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        void (async () => {
          if (dirtyRef.current) await persist();
          onClose();
        })();
      }}
    >
      <div
        className="flex max-h-[min(94dvh,52rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-bold text-neutral-900">
              Edit quiz
            </h2>
            <input
              className="mt-1 w-full max-w-md rounded border border-neutral-300 px-2 py-1 text-sm font-semibold text-neutral-900"
              value={title}
              aria-label="Quiz title"
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
            />
            <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => {
              void (async () => {
                if (dirtyRef.current) await persist();
                onClose();
              })();
            }}
            className="shrink-0 rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-4">
          {loading ? (
            <p className="text-sm text-neutral-600">Loading…</p>
          ) : error ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                <p>
                  Edits autosave. Assigned homework updates to this quiz’s latest version.
                </p>
                <p
                  className={
                    saveState === "error"
                      ? "font-semibold text-red-700"
                      : saveState === "saved"
                        ? "font-medium text-emerald-800"
                        : "font-medium text-neutral-600"
                  }
                >
                  {saveStatusLabel()}
                </p>
              </div>
              {format === "true_false" ? (
                <PackQuizTfSheetTable
                  rows={tfRows}
                  readOnly={false}
                  onChangeRow={onChangeTfRow}
                  onDeleteRow={onDeleteTfRow}
                />
              ) : format === "letter_scramble" ? (
                <PackQuizLetterSheetTable
                  rows={letterRows}
                  readOnly={false}
                  onChangeRow={onChangeLetterRow}
                  onDeleteRow={onDeleteLetterRow}
                />
              ) : format === "sentence_scramble" ? (
                <PackQuizSentenceSheetTable
                  rows={sentenceRows}
                  readOnly={false}
                  onChangeRow={onChangeSentenceRow}
                  onDeleteRow={onDeleteSentenceRow}
                />
              ) : (
                <PackQuizSheetTable
                  rows={mcRows}
                  readOnly={false}
                  onChangeRow={onChangeMcRow}
                  onDeleteRow={onDeleteMcRow}
                />
              )}
            </>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-4 py-3">
          <button
            type="button"
            onClick={() => void onRegenerate()}
            disabled={loading || regenerating || Boolean(error) || !canRegenerate}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
          >
            {regenerating ? "Regenerating…" : "Regenerate from words"}
          </button>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                if (dirtyRef.current) await persist();
                onClose();
              })();
            }}
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
