"use client";

import Link from "next/link";
import { useState } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { awardPrimaryReward } from "@/lib/primary-player/client";
import type { LessonScreenRow } from "@/lib/lesson/types";

export function MiasMorningPlayer({ lessonId, lessonTitle, screens }: { lessonId: string; lessonTitle: string; screens: LessonScreenRow[] }) {
  const [runId] = useState(() => crypto.randomUUID());
  return <main className="min-h-dvh bg-[var(--pl-bg)] p-3 sm:p-5">
    <div className="mx-auto mb-3 flex max-w-6xl items-center justify-between gap-3">
      <div><p className="text-xs font-extrabold uppercase tracking-widest text-[var(--pl-purple)]">Learning Path</p><h1 className="text-xl font-extrabold">Mia&apos;s Morning</h1></div>
      <Link href="/primary?nav=learn" className="rounded-xl border border-[var(--pl-border)] bg-white px-3 py-2 text-sm font-extrabold">Back to Learn</Link>
    </div>
    <div className="mx-auto min-h-[75dvh] max-w-6xl overflow-hidden rounded-3xl border border-[var(--pl-border)] bg-white shadow-sm">
      <LessonPlayer lessonId={lessonId} lessonTitle={lessonTitle} screens={screens} mode="student" immersiveLayout
        onStudentComplete={() => { void awardPrimaryReward({ eventId: `primary:mias-morning:${runId}`, rewardKind: "substantial_lesson", activityId: "mias-morning", source: "primary_learning_path" }); }} />
    </div>
  </main>;
}
