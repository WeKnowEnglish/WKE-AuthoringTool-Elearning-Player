"use client";

import { useSyncExternalStore } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import type { LessonScreenRow } from "@/lib/lesson/types";

const subscribe = () => () => {};

/** Exact reviewed content; unavailable snapshots never fall back to demo packs. */
export function ReleasedLessonPlayer({ lessonId, title, screens }: { lessonId: string; title: string; screens: LessonScreenRow[] }) {
  // Mount interactive cards on the client so an early click cannot be lost to hydration.
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return <main className="mx-auto max-w-6xl space-y-3 p-4">
    <p className="text-sm text-neutral-600">Reviewed lesson material</p>
    {ready ? <LessonPlayer lessonId={lessonId} lessonTitle={title} screens={screens} mode="preview" />
      : <p role="status">Loading reviewed material…</p>}
  </main>;
}
