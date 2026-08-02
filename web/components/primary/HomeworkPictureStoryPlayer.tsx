"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PictureStoryPlayer } from "@/components/picture-story/PictureStoryPlayer";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { recordPictureStoryHomeworkCompletion } from "@/lib/actions/class-homework";
import {
  toPictureStoryPlayable,
  validatePictureStoryDocument,
} from "@/lib/picture-story";

type Props = {
  homeworkId: string;
  title: string;
  document: Record<string, unknown>;
  alreadyCompleted: boolean;
};

export function HomeworkPictureStoryPlayer({
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
      const document = validatePictureStoryDocument(rawDocument);
      return {
        activity: toPictureStoryPlayable(document),
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
            : "Could not open this picture-story activity.",
      };
    }
  }, [rawDocument]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordPictureStoryHomeworkCompletion({ homeworkId }).then((result) => {
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
        {view.error || "Picture-story content is not available."}
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
    <PictureStoryPlayer
      activity={view.activity}
      eyebrow="Homework · Picture story"
      onMastered={() => setFinished(true)}
    />
  );
}
