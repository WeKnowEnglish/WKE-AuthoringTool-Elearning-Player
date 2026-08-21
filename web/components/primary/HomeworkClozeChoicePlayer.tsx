"use client";

import { acceptPrimaryRewardReceipt } from "@/lib/primary-player/client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClozeChoicePlayer } from "@/components/cloze-choice/ClozeChoicePlayer";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { recordClozeChoiceHomeworkCompletion } from "@/lib/actions/class-homework";
import {
  listClozeChoiceGaps,
  toClozeChoicePlayable,
  validateClozeChoiceDocument,
} from "@/lib/cloze-choice";

type Props = {
  homeworkId: string;
  title: string;
  document: Record<string, unknown>;
  alreadyCompleted: boolean;
};

export function HomeworkClozeChoicePlayer({
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
      const document = validateClozeChoiceDocument(rawDocument);
      return {
        activity: toClozeChoicePlayable(document),
        gapCount: listClozeChoiceGaps(document.segments).length,
        error: null as string | null,
      };
    } catch (error) {
      return {
        activity: null,
        gapCount: 0,
        error:
          error instanceof Error
            ? error.message
            : "Could not open this cloze choice activity.",
      };
    }
  }, [rawDocument]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordClozeChoiceHomeworkCompletion({ homeworkId }).then((result) => {
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
        {view.error || "Cloze choice content is not available."}
      </p>
    );
  }

  if (finished || completedAt) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title} (${view.gapCount} gap${
          view.gapCount === 1 ? "" : "s"
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
    <ClozeChoicePlayer
      activity={view.activity}
      eyebrow="Homework · Cloze with choices"
      onMastered={() => setFinished(true)}
    />
  );
}
