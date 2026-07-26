"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { recordStudioActivityHomeworkCompletion } from "@/lib/actions/class-homework";
import type { HomeworkStudioFormat } from "@/lib/class-homework/types";
import { spacePackToLessonScreens } from "@/lib/teacher-space/pack-to-screens";

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((module) => ({
      default: module.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-8 text-center text-sm font-semibold text-[var(--pl-muted)]">
        Loading activity…
      </div>
    ),
  },
);

type Props = {
  homeworkId: string;
  activityId: string;
  format: HomeworkStudioFormat;
  title: string;
  pack: Record<string, unknown>;
  alreadyCompleted: boolean;
};

export function HomeworkStudioActivityPlayer({
  homeworkId,
  activityId,
  format,
  title,
  pack,
  alreadyCompleted,
}: Props) {
  const [finished, setFinished] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [completedAt, setCompletedAt] = useState<string | null>(
    alreadyCompleted ? "saved" : null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const recordedRef = useRef(alreadyCompleted);

  const view = useMemo(() => {
    try {
      return {
        data: spacePackToLessonScreens(format, pack, activityId),
        error: null as string | null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Could not open this activity.",
      };
    }
  }, [activityId, format, pack]);

  useEffect(() => {
    if (!finished || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordStudioActivityHomeworkCompletion({ homeworkId }).then((result) => {
      setSaving(false);
      if (!result.ok) {
        recordedRef.current = false;
        setSaveError(result.error);
        return;
      }
      setCompletedAt(result.finishedAt);
    });
  }, [finished, homeworkId]);

  if (view.error || !view.data) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 text-sm font-semibold text-[var(--pl-muted)]">
        {view.error || "Activity content is not available."}
      </p>
    );
  }

  if (finished) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${title} (${view.data.screens.length} screen${
          view.data.screens.length === 1 ? "" : "s"
        }).`}
        saving={saving}
        saved={Boolean(completedAt)}
        saveError={saveError}
        retryLabel="Try again"
        onRetry={() => {
          setFinished(false);
          setPlayKey((value) => value + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {alreadyCompleted || completedAt ? (
        <p className="rounded-2xl border border-[var(--pl-success)]/30 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          You already finished this homework. You can still practice again.
        </p>
      ) : null}

      <div className="min-h-[min(70dvh,560px)] overflow-hidden rounded-2xl border border-[var(--pl-border)] bg-white">
        <LessonPlayer
          key={playKey}
          lessonId={view.data.lessonId}
          lessonTitle={view.data.lessonTitle || title}
          screens={view.data.screens}
          mode="preview"
          previewAudience="published"
          immersiveLayout
          onPreviewComplete={() => setFinished(true)}
        />
      </div>
    </div>
  );
}
