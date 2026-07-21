"use client";

import { useEffect, useId, useRef, useState } from "react";
import { loadSavedPackQuiz } from "@/lib/actions/pack-quiz";
import { PackMcQuizPreview } from "@/components/teacher/word-packs/PackMcQuizPreview";
import type { PackQuizCompileResult } from "@/lib/vocabulary/pack-quiz";

type Props = {
  open: boolean;
  onClose: () => void;
  quizId: string;
  quizTitle: string;
};

export function SavedPackQuizPreviewOverlay({ open, onClose, quizId, quizTitle }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [compiled, setCompiled] = useState<PackQuizCompileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompiled(null);
    setError(null);
    setLoading(true);
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);

    void loadSavedPackQuiz(quizId).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const quiz = result.quiz;
      setCompiled({
        draft: {
          packId: quiz.pack_id ?? "",
          packTitle: quiz.title,
          format: quiz.format,
          wordIds: quiz.word_ids,
          options: quiz.options,
          createdAt: quiz.created_at,
        },
        questions: quiz.questions,
        skippedWordIds: [],
        warnings: quiz.warnings,
      });
    });

    return () => window.clearTimeout(t);
  }, [open, quizId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-neutral-900">
              Preview quiz
            </h2>
            <p className="mt-0.5 truncate text-sm text-neutral-600" title={quizTitle}>
              {quizTitle}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
          {loading ? (
            <p className="text-sm text-neutral-600">Loading…</p>
          ) : error ? (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : compiled ? (
            <PackMcQuizPreview
              compiled={compiled}
              onBackToFormats={onClose}
              hideSave
              backLabel="Close preview"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
