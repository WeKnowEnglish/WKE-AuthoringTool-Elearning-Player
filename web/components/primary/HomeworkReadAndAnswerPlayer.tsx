"use client";

import { acceptPrimaryRewardReceipt } from "@/lib/primary-player/client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ReadAndAnswerPlayer } from "@/components/read-and-answer/ReadAndAnswerPlayer";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { recordReadAndAnswerHomeworkCompletion } from "@/lib/actions/class-homework";
import {
  toReadAndAnswerPlayable,
  validateReadAndAnswerDocument,
} from "@/lib/read-and-answer";

type Props = {
  homeworkId: string;
  title: string;
  document: Record<string, unknown>;
  alreadyCompleted: boolean;
};

export function HomeworkReadAndAnswerPlayer({
  homeworkId,
  title,
  document: rawDocument,
  alreadyCompleted,
}: Props) {
  const [finished, setFinished] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(
    alreadyCompleted ? "saved" : null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const recordedRef = useRef(alreadyCompleted);

  const view = useMemo(() => {
    try {
      const document = validateReadAndAnswerDocument(rawDocument);
      return {
        activity: toReadAndAnswerPlayable(document),
        questionCount: document.questions.length,
        error: null as string | null,
      };
    } catch (error) {
      return {
        activity: null,
        questionCount: 0,
        error:
          error instanceof Error
            ? error.message
            : "Could not open this read-and-answer activity.",
      };
    }
  }, [rawDocument]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordReadAndAnswerHomeworkCompletion({ homeworkId }).then((result) => {
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

  if (view.error || !view.activity) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 text-sm font-semibold text-[var(--pl-muted)]">
        {view.error || "Read-and-answer content is not available."}
      </p>
    );
  }

  if (finished || completedAt) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title} (${view.questionCount} question${
          view.questionCount === 1 ? "" : "s"
        }).`}
        saving={saving}
        saved={Boolean(completedAt)}
        saveError={saveError}
        retryLabel="Try again"
        onRetry={() => {
          setFinished(false);
          setSaveError(null);
        }}
      />
    );
  }

  return (
    <ReadAndAnswerPlayer
      activity={view.activity}
      eyebrow="Homework · Read and answer"
      onMastered={() => setFinished(true)}
    />
  );
}
