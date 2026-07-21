"use client";

import { useEffect, useRef, useState } from "react";
import { McQuizView } from "@/components/lesson/interactions/McQuizView";
import { recordPackQuizHomeworkCompletion } from "@/lib/actions/class-homework";
import type { PackQuizCompiledQuestion } from "@/lib/vocabulary/pack-quiz";

type Props = {
  homeworkId: string;
  title: string;
  questions: PackQuizCompiledQuestion[];
  alreadyCompleted: boolean;
};

export function HomeworkPackQuizPlayer({
  homeworkId,
  title,
  questions,
  alreadyCompleted,
}: Props) {
  const [index, setIndex] = useState(0);
  const [passed, setPassed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(
    alreadyCompleted ? "saved" : null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const recordedRef = useRef(alreadyCompleted);

  const total = questions.length;
  const current = questions[index];

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordPackQuizHomeworkCompletion({ homeworkId }).then((result) => {
      setSaving(false);
      if (!result.ok) {
        recordedRef.current = false;
        setSaveError(result.error);
        return;
      }
      setCompletedAt(result.finishedAt);
    });
  }, [finished, homeworkId]);

  function goNext() {
    if (index >= total - 1) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setPassed(false);
  }

  if (total === 0 || !current) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
        This quiz has no questions yet.
      </p>
    );
  }

  if (finished) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
        <p className="text-lg font-extrabold text-emerald-950">Nice work!</p>
        <p className="mt-1 text-sm font-semibold text-emerald-900">
          You finished {title} ({total} question{total === 1 ? "" : "s"}).
        </p>
        {saving ? (
          <p className="mt-2 text-xs font-semibold text-emerald-800">Saving for your teacher…</p>
        ) : completedAt ? (
          <p className="mt-2 text-xs font-semibold text-emerald-800">Saved for your teacher.</p>
        ) : null}
        {saveError ? (
          <p className="mt-2 text-xs font-semibold text-amber-900">{saveError}</p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setIndex(0);
            setPassed(false);
            setFinished(false);
          }}
          className="mt-4 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alreadyCompleted || completedAt ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          You already finished this homework. You can still practice again.
        </p>
      ) : null}
      <p className="text-sm font-semibold text-neutral-600">
        Question {index + 1} of {total}
      </p>
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-sky-50/40">
        <McQuizView
          key={current.id}
          parsed={current.payload}
          muted={false}
          passed={passed}
          snappyCorrect
          showBack={index > 0}
          onBack={() => {
            if (index <= 0) return;
            setIndex((value) => value - 1);
            setPassed(false);
          }}
          onPass={() => setPassed(true)}
          onWrong={() => undefined}
          onNext={goNext}
        />
      </div>
    </div>
  );
}
