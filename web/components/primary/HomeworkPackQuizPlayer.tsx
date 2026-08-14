"use client";

import { acceptPrimaryRewardReceipt } from "@/lib/primary-player/client";

import { useEffect, useRef, useState } from "react";
import {
  HomeworkFinishPanel,
  HomeworkProgressBar,
} from "@/components/primary/HomeworkPlayChrome";
import { PackQuizQuestionPlayer } from "@/components/pack-quiz/PackQuizQuestionPlayer";
import { recordPackQuizHomeworkCompletion } from "@/lib/actions/class-homework";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import type { PackQuizCompiledQuestion } from "@/lib/vocabulary/pack-quiz";

/** Product C — teacher pack quiz player. */
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
  const { muted } = useAudioMuted();
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
      if (result.rewardReceipt) acceptPrimaryRewardReceipt(result.rewardReceipt);
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
      <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-6 text-sm font-semibold text-[var(--pl-muted)]">
        This quiz has no questions yet.
      </p>
    );
  }

  if (finished) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title} (${total} question${total === 1 ? "" : "s"}).`}
        saving={saving}
        saved={Boolean(completedAt)}
        saveError={saveError}
        retryLabel="Try again"
        onRetry={() => {
          setIndex(0);
          setPassed(false);
          setFinished(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {alreadyCompleted || completedAt ? (
        <p className="rounded-2xl border border-[var(--pl-success)]/30 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          You already finished this homework. You can still practice again.
        </p>
      ) : null}

      <HomeworkProgressBar
        label={`Question ${index + 1} of ${total}`}
        current={index + 1}
        total={total}
      />

      <div className="overflow-hidden rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] shadow-sm">
        <PackQuizQuestionPlayer
          question={current}
          muted={muted}
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
