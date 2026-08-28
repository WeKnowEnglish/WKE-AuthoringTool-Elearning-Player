"use client";

import { useMemo } from "react";
import type { LearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";
import { PracticeTrackPlayer } from "@/components/practice/PracticeTrackPlayer";

type Props = {
  pack: LearningTrackLessonPlayerPack;
  focusBeatId?: string | null;
  lessonId?: string;
};

/** Teacher / compiler student preview for practice learning tracks. */
export function PracticeTrackStudentPreview({
  pack,
  focusBeatId = null,
  lessonId,
}: Props) {
  const resolvedLessonId = useMemo(
    () => lessonId ?? `practice-preview-${pack.id}`,
    [lessonId, pack.id],
  );

  if (!pack.screens.length) {
    return (
      <div className="flex h-full min-h-[16rem] items-center justify-center bg-[radial-gradient(circle_at_top,_#fafaf9,_#e7e5e4_70%)] p-6">
        <div className="w-full max-w-md rounded-2xl border border-dashed border-stone-300 bg-white/90 px-6 py-10 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Student preview
          </p>
          <p className="mt-2 text-lg font-extrabold text-stone-900">
            Add a practice activity
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-stone-600">
            Compile the track to preview how students will move through each beat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PracticeTrackPlayer
      pack={pack}
      lessonId={resolvedLessonId}
      mode="authoring-preview"
      focusBeatId={focusBeatId}
    />
  );
}
