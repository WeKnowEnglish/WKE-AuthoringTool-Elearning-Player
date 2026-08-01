"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DefinitionMatchPlayer } from "@/components/definition-match/DefinitionMatchPlayer";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { recordDefinitionMatchHomeworkCompletion } from "@/lib/actions/class-homework";
import {
  toDefinitionMatchPlayable,
  validateDefinitionMatchDocument,
} from "@/lib/definition-match";

type Props = {
  homeworkId: string;
  title: string;
  document: Record<string, unknown>;
  alreadyCompleted: boolean;
};

export function HomeworkDefinitionMatchPlayer({
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
      const document = validateDefinitionMatchDocument(rawDocument);
      return {
        activity: toDefinitionMatchPlayable(document),
        pairCount: document.pairs.length,
        error: null as string | null,
      };
    } catch (error) {
      return {
        activity: null,
        pairCount: 0,
        error:
          error instanceof Error
            ? error.message
            : "Could not open this definition match activity.",
      };
    }
  }, [rawDocument]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordDefinitionMatchHomeworkCompletion({ homeworkId }).then((result) => {
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
        {view.error || "Definition match content is not available."}
      </p>
    );
  }

  if (finished || completedAt) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title} (${view.pairCount} pair${
          view.pairCount === 1 ? "" : "s"
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
    <DefinitionMatchPlayer
      activity={view.activity}
      eyebrow="Homework · Definition match"
      onMastered={() => setFinished(true)}
    />
  );
}
