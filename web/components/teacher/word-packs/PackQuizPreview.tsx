"use client";

import Link from "next/link";
import { useState } from "react";
import { PackQuizQuestionPlayer } from "@/components/pack-quiz/PackQuizQuestionPlayer";
import { savePackQuiz } from "@/lib/actions/pack-quiz";
import type {
  PackQuizCompiledQuestion,
  PackQuizCompileResult,
  PackQuizDraft,
} from "@/lib/vocabulary/pack-quiz";
import { isPackQuizMcQuestion } from "@/lib/vocabulary/pack-quiz";

type Props = {
  compiled: PackQuizCompileResult;
  onBackToFormats: () => void;
  /** When true, hide Save (already-persisted quiz preview). */
  hideSave?: boolean;
  backLabel?: string;
  /** After a successful save, open the spreadsheet editor (E2+). */
  onEditSavedQuiz?: (quiz: { id: string; title: string }) => void;
};

/** Teacher preview for any pack-quiz format (MC today; T/F & scrambles via F1+). */
export function PackQuizPreview({
  compiled,
  onBackToFormats,
  hideSave = false,
  backLabel = "Back to formats",
  onEditSavedQuiz,
}: Props) {
  const [index, setIndex] = useState(0);
  const [passed, setPassed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [savedQuizTitle, setSavedQuizTitle] = useState<string | null>(null);

  const draft: PackQuizDraft = compiled.draft;
  const total = compiled.questions.length;
  const current: PackQuizCompiledQuestion | undefined = compiled.questions[index];

  function goNext() {
    if (index >= total - 1) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setPassed(false);
  }

  async function onSave() {
    if (hideSave || savedQuizId || saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const result = await savePackQuiz({
        draft,
        questions: compiled.questions,
        warnings: compiled.warnings,
      });
      if (!result.ok) {
        setSaveMessage(result.error);
        return;
      }
      setSavedQuizId(result.quiz.id);
      setSavedQuizTitle(result.quiz.title);
      setSaveMessage(`Saved as draft: ${result.quiz.title}`);
    } finally {
      setSaving(false);
    }
  }

  const saveControls = hideSave ? null : (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saving || Boolean(savedQuizId) || total === 0}
        className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {savedQuizId ? "Saved" : saving ? "Saving…" : "Save quiz"}
      </button>
      {savedQuizId && onEditSavedQuiz ? (
        <button
          type="button"
          onClick={() =>
            onEditSavedQuiz({
              id: savedQuizId,
              title: savedQuizTitle ?? draft.packTitle,
            })
          }
          className="rounded border border-neutral-900 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
        >
          Edit quiz
        </button>
      ) : null}
      {saveMessage ? (
        <p className={`text-xs ${savedQuizId ? "text-emerald-800" : "text-amber-900"}`}>
          {saveMessage}
          {savedQuizId ? (
            <>
              {" "}
              ·{" "}
              <Link
                href="/teacher/word-packs?tab=quizzes"
                className="font-semibold underline underline-offset-2"
              >
                View in Quizzes
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );

  if (total === 0 || !current) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-700">No questions to preview.</p>
        <button
          type="button"
          onClick={onBackToFormats}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          {backLabel}
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
        <p className="text-sm font-semibold text-emerald-950">Preview complete</p>
        <p className="text-sm text-emerald-900">
          You walked through {total} question{total === 1 ? "" : "s"} from this pack.
        </p>
        {compiled.warnings.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-xs text-emerald-900/80">
            {compiled.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        <div className="space-y-2 pt-1">
          {saveControls}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setPassed(false);
                setFinished(false);
              }}
              className="rounded border border-emerald-700 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-100/60"
            >
              Play again
            </button>
            <button
              type="button"
              onClick={onBackToFormats}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              {backLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const modeHint =
    isPackQuizMcQuestion(current) && current.mode === "find_lemma" ? " · find-the-word" : "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500">
          Teacher preview · Question {index + 1} of {total}
          {modeHint}
        </p>
        <button
          type="button"
          onClick={onBackToFormats}
          className="text-xs font-semibold text-neutral-600 underline-offset-2 hover:underline"
        >
          {backLabel}
        </button>
      </div>

      {compiled.warnings.length > 0 && index === 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {compiled.warnings.join(" ")}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-sky-50/40">
        <PackQuizQuestionPlayer
          question={current}
          muted={false}
          passed={passed}
          snappyCorrect
          showBack={index > 0}
          onBack={() => {
            if (index <= 0) return;
            setIndex((i) => i - 1);
            setPassed(false);
          }}
          onPass={() => setPassed(true)}
          onWrong={() => {}}
          onNext={goNext}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
        {saveControls ?? <span />}
        <button
          type="button"
          onClick={goNext}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          {index >= total - 1 ? "Skip to finish" : "Skip question"}
        </button>
      </div>
    </div>
  );
}
