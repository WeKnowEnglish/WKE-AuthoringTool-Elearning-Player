"use client";

import { acceptPrimaryRewardReceipt } from "@/lib/primary-player/client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WordAnnotationPlayer } from "@/components/word-annotation/WordAnnotationPlayer";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { recordWordAnnotationHomeworkCompletion } from "@/lib/actions/class-homework";
import {
  countWordAnnotationTargets,
  toWordAnnotationPlayable,
  validateWordAnnotationDocument,
} from "@/lib/word-annotation";

type Props = {
  homeworkId: string;
  title: string;
  document: Record<string, unknown>;
  alreadyCompleted: boolean;
};

export function HomeworkWordAnnotationPlayer({
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
      const document = validateWordAnnotationDocument(rawDocument);
      return {
        activity: toWordAnnotationPlayable(document),
        targetCount: countWordAnnotationTargets(document.sentences),
        error: null as string | null,
      };
    } catch (error) {
      return {
        activity: null,
        targetCount: 0,
        error:
          error instanceof Error
            ? error.message
            : "Could not open this word annotation activity.",
      };
    }
  }, [rawDocument]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordWordAnnotationHomeworkCompletion({ homeworkId }).then((result) => {
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
        {view.error || "Word annotation content is not available."}
      </p>
    );
  }

  if (finished || completedAt) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title} (${view.targetCount} target${
          view.targetCount === 1 ? "" : "s"
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
    <WordAnnotationPlayer
      activity={view.activity}
      eyebrow="Homework · Word annotation"
      onMastered={() => setFinished(true)}
    />
  );
}
