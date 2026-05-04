"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import type { LessonRow, LessonScreenRow, ModuleRow } from "@/lib/data/catalog";
import type { CompletionPlayground } from "@/lib/lesson-schemas";
import { isModuleUnlocked } from "@/lib/gating";
import { getProgressSnapshot } from "@/lib/progress/local-storage";

type Props = {
  module: ModuleRow;
  modules: ModuleRow[];
  lessons: LessonRow[];
  lesson: LessonRow;
  screens: LessonScreenRow[];
  completionPlayground?: CompletionPlayground | null;
};

export function LessonGate({
  module,
  modules,
  lessons,
  lesson,
  screens,
  completionPlayground = null,
}: Props) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const snap = getProgressSnapshot();
    const ok = isModuleUnlocked(module, modules, lessons, snap.completedLessonIds);
    queueMicrotask(() => {
      setAllowed(ok);
      setReady(true);
    });
  }, [module, modules, lessons]);

  if (!ready) {
    return (
      <KidPanel>
        <p className="text-lg font-semibold">Loading…</p>
      </KidPanel>
    );
  }

  if (!allowed) {
    return (
      <KidPanel>
        <h1 className="text-2xl font-bold">Module locked</h1>
        <p className="mt-2 text-lg">
          Finish the previous module to open this lesson.
        </p>
        <Link
          href="/learn"
          className="mt-4 inline-block rounded px-1 font-bold underline transition-[transform,opacity] duration-100 [touch-action:manipulation] active:scale-[0.98] active:opacity-80 motion-reduce:active:scale-100"
        >
          Back to lessons
        </Link>
      </KidPanel>
    );
  }

  return (
    <LessonPlayer
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      screens={screens}
      completionPlayground={completionPlayground}
    />
  );
}
