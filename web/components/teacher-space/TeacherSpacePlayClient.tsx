"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { classroomFormatLabel } from "@/components/teacher-space/ClassroomFormatIcon";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import { spacePackToLessonScreens } from "@/lib/teacher-space/pack-to-screens";
import { classroomThemeStyle } from "@/lib/teacher-space/themes";

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((m) => ({
      default: m.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center px-6 py-10 text-center">
        <p className="text-lg font-semibold text-[var(--classroom-ink)]">Loading activity…</p>
      </div>
    ),
  },
);

type Props = {
  spaceTitle: string;
  itemId: string;
  title: string;
  format: StudioActivityFormat;
  pack: unknown;
  backHref: string;
  themeId: string;
};

export function TeacherSpacePlayClient({
  spaceTitle,
  itemId,
  title,
  format,
  pack,
  backHref,
  themeId,
}: Props) {
  const [generation, setGeneration] = useState(0);
  const themeStyle = useMemo(() => classroomThemeStyle(themeId), [themeId]);

  const parsed = useMemo(() => {
    try {
      return {
        view: spacePackToLessonScreens(format, pack, itemId),
        error: null as string | null,
      };
    } catch (err) {
      return {
        view: null,
        error: err instanceof Error ? err.message : "Could not open this activity.",
      };
    }
  }, [format, pack, itemId]);
  const { view, error } = parsed;

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{
        ...themeStyle,
        background: "var(--classroom-surface-2)",
        color: "var(--classroom-ink)",
      }}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-black/10 bg-[var(--classroom-panel)] px-3 py-2 shadow-sm sm:gap-3 sm:px-4">
        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center rounded-lg border border-black/10 bg-white/80 px-2.5 py-1 text-sm font-bold text-[var(--classroom-ink)] hover:bg-white"
        >
          ← Classroom
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[var(--classroom-muted)]">
            {spaceTitle} · {classroomFormatLabel(format)}
          </p>
          <h1 className="truncate text-sm font-extrabold text-[var(--classroom-ink)] sm:text-base">
            {title}
          </h1>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1 text-sm font-semibold hover:bg-[var(--classroom-tile)]"
          onClick={() => setGeneration((n) => n + 1)}
        >
          Restart
        </button>
      </header>

      {error || !view ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-900">
            {error || "This activity is unavailable."}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden bg-white">
          <LessonPlayer
            key={generation}
            lessonId={view.lessonId}
            lessonTitle={view.lessonTitle}
            screens={view.screens}
            mode="preview"
            previewAudience="published"
            previewFinishHref={backHref}
            previewFinishLabel="Back to classroom"
            immersiveLayout
          />
        </div>
      )}
    </div>
  );
}
