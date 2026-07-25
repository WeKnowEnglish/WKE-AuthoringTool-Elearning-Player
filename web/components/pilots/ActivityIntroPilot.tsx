"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  activityIntroToLessonScreen,
  FOOD_BAKERY_ACTIVITY_INTRO,
} from "@/lib/activity-intro";

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((m) => ({
      default: m.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border-2 border-kid-ink/20 bg-white px-6 py-10 text-center">
        <p className="text-lg font-extrabold text-kid-ink">Loading intro…</p>
      </div>
    ),
  },
);

/** Matches LessonPlayer preview branch for `activity-*` lesson ids. */
const LESSON_ID = `activity-intro-${FOOD_BAKERY_ACTIVITY_INTRO.introId}`;

export function ActivityIntroPilot() {
  const [generation, setGeneration] = useState(0);

  const screens = useMemo(
    () => [activityIntroToLessonScreen(FOOD_BAKERY_ACTIVITY_INTRO, LESSON_ID)],
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <KidPanel>
        <h1 className="text-2xl font-extrabold text-kid-ink">
          Activity intro (pilot)
        </h1>
        <p className="mt-1 text-sm font-semibold text-kid-ink/80">
          Comic-stage opener — Primary mascot host, speech bubble, bobbing food
          (bread, milk, eggs, jam). Stage-overlay Next.
        </p>
      </KidPanel>

      <div className="flex min-h-[min(70dvh,560px)] flex-col overflow-hidden rounded-2xl border-4 border-kid-ink bg-[#dbeafe]">
        <LessonPlayer
          key={generation}
          lessonId={LESSON_ID}
          lessonTitle={FOOD_BAKERY_ACTIVITY_INTRO.topicLabel}
          screens={screens}
          mode="preview"
          immersiveLayout
          storyControlsPlacement="stage-overlay"
        />
      </div>

      <div className="flex justify-center">
        <KidButton
          type="button"
          variant="secondary"
          onClick={() => setGeneration((n) => n + 1)}
        >
          Remount player
        </KidButton>
      </div>
    </div>
  );
}
