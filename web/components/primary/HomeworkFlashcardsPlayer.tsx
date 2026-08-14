"use client";

import { acceptPrimaryRewardReceipt } from "@/lib/primary-player/client";

import { useEffect, useRef, useState } from "react";
import {
  HomeworkFinishPanel,
  HomeworkProgressBar,
} from "@/components/primary/HomeworkPlayChrome";
import {
  FlashcardFaceStack,
  faceLabel,
  facesForSide,
} from "@/components/teacher/word-packs/FlashcardFaceStack";
import { recordPackFlashcardsHomeworkCompletion } from "@/lib/actions/class-homework";
import type { PackFlashcardCompiledCard } from "@/lib/vocabulary/pack-flashcards";

/** Product C — teacher pack flashcards player. */
type Props = {
  homeworkId: string;
  title: string;
  cards: PackFlashcardCompiledCard[];
  alreadyCompleted: boolean;
};

export function HomeworkFlashcardsPlayer({
  homeworkId,
  title,
  cards,
  alreadyCompleted,
}: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(
    alreadyCompleted ? "saved" : null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const recordedRef = useRef(alreadyCompleted);

  const total = cards.length;
  const current = cards[index];

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordPackFlashcardsHomeworkCompletion({ homeworkId }).then((result) => {
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

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setFlipped(false);
  }

  function goNext() {
    if (index >= total - 1) {
      setFinished(true);
      return;
    }
    goTo(index + 1);
  }

  if (total === 0 || !current) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-6 text-sm font-semibold text-[var(--pl-muted)]">
        This set has no cards yet.
      </p>
    );
  }

  if (finished) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title} (${total} card${total === 1 ? "" : "s"}).`}
        saving={saving}
        saved={Boolean(completedAt)}
        saveError={saveError}
        retryLabel="Study again"
        onRetry={() => {
          setFinished(false);
          goTo(0);
        }}
      />
    );
  }

  const side = flipped ? "back" : "front";
  const sideFaces = facesForSide(current, side);

  return (
    <div className="space-y-4">
      {alreadyCompleted || completedAt ? (
        <p className="rounded-2xl border border-[var(--pl-success)]/30 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          You already finished this homework. You can still study again.
        </p>
      ) : null}

      <HomeworkProgressBar
        label={`Card ${index + 1} of ${total} · ${flipped ? "Back" : "Front"}`}
        current={index + 1}
        total={total}
      />

      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="flex min-h-[16rem] w-full flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-8 text-left shadow-sm transition hover:border-[var(--pl-purple)] active:scale-[0.99]"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--pl-purple)]">
          {sideFaces.map(faceLabel).join(" · ") || "Empty"} · tap to flip
        </p>
        <FlashcardFaceStack faces={sideFaces} values={current.faces} size="lg" />
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (index <= 0) return;
            goTo(index - 1);
          }}
          disabled={index <= 0}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-white px-4 py-2 text-sm font-extrabold text-[var(--pl-ink)] disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={goNext}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 py-2 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] active:scale-[0.98]"
        >
          {index >= total - 1 ? "Finish" : "Next card"}
        </button>
      </div>
    </div>
  );
}
