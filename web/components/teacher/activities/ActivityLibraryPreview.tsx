"use client";

import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import type { LessonScreenRow } from "@/lib/data/catalog";
import { interactionPayloadSchema, startPayloadSchema } from "@/lib/lesson-schemas";

type Props = {
  activityId: string;
  title: string;
  mode?: "teacher_preview" | "student";
  payload:
    | {
        start?: unknown;
        items?: unknown[];
        settings?: {
          shuffle_questions?: boolean;
          auto_advance_on_pass_default?: boolean;
        };
      }
    | null
    | undefined;
};

export function ActivityLibraryPreview({
  activityId,
  title,
  mode = "teacher_preview",
  payload,
}: Props) {
  const start = startPayloadSchema.safeParse(payload?.start);
  const items = Array.isArray(payload?.items) ? payload.items : [];
  let interactionScreens = items
    .map((raw, index) => {
      const parsed = interactionPayloadSchema.safeParse(raw);
      if (!parsed.success) return null;
      const payloadWithDefaults =
        parsed.data.auto_advance_on_pass === undefined &&
        payload?.settings?.auto_advance_on_pass_default === true ?
          { ...parsed.data, auto_advance_on_pass: true }
        : parsed.data;
      return {
        id: `${activityId}-q-${index}`,
        lesson_id: `activity-${activityId}`,
        order_index: index + 1,
        screen_type: "interaction",
        payload: payloadWithDefaults,
      } satisfies LessonScreenRow;
    })
    .filter((row) => row !== null) as LessonScreenRow[];
  if (payload?.settings?.shuffle_questions) {
    // Shuffle only interaction screens; keep start fixed as first screen.
    interactionScreens = stableShuffleInteractions(interactionScreens, activityId);
  }
  const startScreen: LessonScreenRow = {
    id: `${activityId}-start`,
    lesson_id: `activity-${activityId}`,
    order_index: 0,
    screen_type: "start",
    payload:
      start.success ?
        start.data
      : startPayloadSchema.parse({
          type: "start",
          image_url: "https://placehold.co/800x520/e2e8f0/1e293b?text=Start+Activity",
          image_fit: "contain",
          cta_label: "Start activity",
          read_aloud_title: title,
        }),
  };
  const screens = [startScreen, ...interactionScreens];

  return (
    <div className="mt-4 w-full rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      {mode === "teacher_preview" ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Student preview
        </p>
      ) : null}
      <LessonPlayer
        lessonId={`activity-${activityId}`}
        lessonTitle={mode === "teacher_preview" ? `${title} (Preview)` : title}
        screens={screens}
        mode={mode === "teacher_preview" ? "preview" : "student"}
      />
    </div>
  );
}

function stableShuffleInteractions(
  screens: LessonScreenRow[],
  seedKey: string,
): LessonScreenRow[] {
  const withScore = screens.map((screen, idx) => ({
    screen,
    score: hashString(`${seedKey}:${screen.id}:${idx}`),
  }));
  withScore.sort((a, b) => a.score - b.score);
  return withScore.map((entry) => entry.screen);
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}
