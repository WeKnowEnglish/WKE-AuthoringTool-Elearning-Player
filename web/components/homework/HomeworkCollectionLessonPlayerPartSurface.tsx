"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  appendGradedActivityAttempt,
  buildGradedActivityRunResult,
  type GradedActivityScreenOutcome,
} from "@/lib/graded-activities";
import { isCompletionLpStudioFormat } from "@/lib/activity-formats/registry";
import {
  homeworkCollectionResponsesFromLessonPlayerRun,
} from "@/lib/homework-collections/lesson-player-responses";
import type { HomeworkCollectionLessonPlayerPackPart } from "@/lib/homework-collections";
import {
  homeworkCollectionLessonPlayerScreens,
  lessonPlayerPackItemIds,
} from "@/lib/homework-collections/lesson-player-pack";

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((module) => ({
      default: module.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm font-semibold text-stone-600">
        Loading quiz…
      </div>
    ),
  },
);

type Props = {
  part: HomeworkCollectionLessonPlayerPackPart;
  answers: Record<string, string>;
  onAnswersChange: (answers: Record<string, string>) => void;
  previewMode?: boolean;
};

export function HomeworkCollectionLessonPlayerPartSurface({
  part,
  answers,
  onAnswersChange,
  previewMode = false,
}: Props) {
  const view = useMemo(() => homeworkCollectionLessonPlayerScreens(part), [part]);
  const outcomesRef = useRef<Record<string, GradedActivityScreenOutcome>>({});
  const [playKey, setPlayKey] = useState(0);

  const syncAnswersFromOutcomes = useCallback(
    (outcomes: Record<string, GradedActivityScreenOutcome>) => {
      const run = buildGradedActivityRunResult({
        lessonId: view.lessonId,
        outcomes,
      });
      const mapped = homeworkCollectionResponsesFromLessonPlayerRun(
        { version: 1, parts: [part] },
        run,
      );
      const nextAnswers = mapped[part.id]?.answers ?? {};
      if (isCompletionLpStudioFormat(part.studioFormat)) {
        const ids = lessonPlayerPackItemIds(part);
        const completed = ids.length > 0 && ids.every((id) => nextAnswers[id]);
        if (completed) {
          onAnswersChange(
            Object.fromEntries(ids.map((id) => [id, nextAnswers[id] ?? "completed"])),
          );
          return;
        }
      }
      onAnswersChange(nextAnswers);
    },
    [onAnswersChange, part, view.lessonId],
  );

  const onActivityAttempt = useCallback(
    (event: import("@/lib/graded-activities").GradedActivityAttemptEvent) => {
      const screen = view.screens.find((row) => row.id === event.screenId);
      if (!screen) return;
      const current = outcomesRef.current[event.screenId];
      const { outcome } = appendGradedActivityAttempt({
        lessonId: view.lessonId,
        screen: {
          screenId: screen.id,
          screenType: screen.screen_type,
          payload: screen.payload,
        },
        current,
        response: event.response,
        passed: event.passed,
        occurredAt: event.occurredAt,
      });
      const next = { ...outcomesRef.current, [event.screenId]: outcome };
      outcomesRef.current = next;
      syncAnswersFromOutcomes(next);
    },
    [syncAnswersFromOutcomes, view.lessonId, view.screens],
  );

  const onComplete = useCallback(
    (result: import("@/lib/graded-activities").GradedActivityRunResult) => {
      if (isCompletionLpStudioFormat(part.studioFormat)) {
        const ids = lessonPlayerPackItemIds(part);
        onAnswersChange(Object.fromEntries(ids.map((id) => [id, "completed"])));
        return;
      }
      const mapped = homeworkCollectionResponsesFromLessonPlayerRun(
        { version: 1, parts: [part] },
        result,
      );
      onAnswersChange(mapped[part.id]?.answers ?? {});
    },
    [onAnswersChange, part],
  );

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2 sm:p-3">
      <LessonPlayer
        key={playKey}
        lessonId={view.lessonId}
        lessonTitle={view.lessonTitle}
        screens={view.screens}
        mode={previewMode ? "preview" : "student"}
        previewAudience="authoring"
        immersiveLayout
        embedNaturalHeight
        onActivityAttempt={onActivityAttempt}
        onPreviewComplete={previewMode ? onComplete : undefined}
        onStudentComplete={previewMode ? undefined : onComplete}
        onPreviewRestart={() => {
          outcomesRef.current = {};
          setPlayKey((value) => value + 1);
        }}
      />
      {Object.keys(answers).length > 0 ? (
        <p className="mt-2 text-center text-xs font-bold text-emerald-700">
          Progress saved for this activity.
        </p>
      ) : null}
    </div>
  );
}
