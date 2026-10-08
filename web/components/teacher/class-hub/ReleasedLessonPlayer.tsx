"use client";

import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import type { LessonScreenRow } from "@/lib/lesson/types";

/** Exact reviewed content; unavailable snapshots never fall back to demo packs. */
export function ReleasedLessonPlayer({ lessonId, title, screens }: { lessonId: string; title: string; screens: LessonScreenRow[] }) {
  return <main className="mx-auto max-w-6xl space-y-3 p-4">
    <p className="text-sm text-neutral-600">Reviewed lesson material</p>
    <LessonPlayer lessonId={lessonId} lessonTitle={title} screens={screens} mode="preview" />
  </main>;
}
