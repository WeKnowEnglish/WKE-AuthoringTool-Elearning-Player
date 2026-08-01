"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SentenceColumnsPlayer } from "@/components/sentence-columns/SentenceColumnsPlayer";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { recordSentenceColumnsHomeworkCompletion } from "@/lib/actions/class-homework";
import {
  toSentenceColumnsPlayable,
  validateSentenceColumnsDocument,
} from "@/lib/sentence-columns";

type Props = {
  homeworkId: string;
  title: string;
  document: Record<string, unknown>;
  alreadyCompleted: boolean;
};

export function HomeworkSentenceColumnsPlayer({
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
      const document = validateSentenceColumnsDocument(rawDocument);
      return {
        activity: toSentenceColumnsPlayable(document),
        error: null as string | null,
      };
    } catch (error) {
      return {
        activity: null,
        error:
          error instanceof Error
            ? error.message
            : "Could not open this sentence columns activity.",
      };
    }
  }, [rawDocument]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordSentenceColumnsHomeworkCompletion({ homeworkId }).then((result) => {
      setSaving(false);
      if (!result.ok) {
        recordedRef.current = false;
        setSaveError(result.error);
        return;
      }
      setCompletedAt(result.finishedAt);
    });
  }, [finished, homeworkId]);

  if (view.error || !view.activity) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 text-sm font-semibold text-[var(--pl-muted)]">
        {view.error || "Sentence columns content is not available."}
      </p>
    );
  }

  if (finished || completedAt) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title} (${view.activity.challenges.length} sentence${
          view.activity.challenges.length === 1 ? "" : "s"
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
    <SentenceColumnsPlayer
      activity={view.activity}
      eyebrow="Homework · Sentence columns"
      onMastered={() => setFinished(true)}
    />
  );
}
