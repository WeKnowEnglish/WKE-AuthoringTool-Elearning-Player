"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import { spacePackToLessonScreens } from "@/lib/teacher-space/pack-to-screens";
import type { VirtualClassroomLearnActivity } from "@/lib/virtual-classroom/liveblocks/initial-storage";

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((m) => ({
      default: m.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-600">
        Loading activity…
      </div>
    ),
  },
);

type Props = {
  sessionId: string;
  learnActivity: VirtualClassroomLearnActivity;
};

export function VirtualClassroomActivityEmbed({ sessionId, learnActivity }: Props) {
  const [pack, setPack] = useState<unknown | null>(null);
  const [format, setFormat] = useState<StudioActivityFormat | null>(null);
  const [title, setTitle] = useState(learnActivity.title);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPack(null);
    void fetch(`/api/virtual-classroom/${sessionId}/learn-activity/pack`, {
      credentials: "include",
    })
      .then(async (res) => {
        const payload = (await res.json()) as {
          error?: string;
          pack?: unknown;
          format?: string;
          title?: string;
        };
        if (!res.ok) throw new Error(payload.error ?? "Could not load activity.");
        if (cancelled) return;
        setPack(payload.pack ?? null);
        setFormat((payload.format as StudioActivityFormat) || null);
        setTitle(payload.title || learnActivity.title);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load activity.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [learnActivity.activityId, learnActivity.title, sessionId]);

  const view = useMemo(() => {
    if (!pack || !format) return null;
    try {
      return {
        data: spacePackToLessonScreens(format, pack, learnActivity.activityId),
        error: null as string | null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "This activity format can’t play here yet.",
      };
    }
  }, [format, learnActivity.activityId, pack]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[18rem] items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600">
        Loading activity…
      </div>
    );
  }

  if (error || view?.error || !view?.data) {
    return (
      <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-center">
        <p className="text-sm font-semibold text-amber-950">
          {error || view?.error || "Activity unavailable"}
        </p>
        <p className="max-w-sm text-xs text-amber-900/80">
          Practice tracks and most quiz formats play in Learn. Some formats still need a dedicated
          pilot.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-100 px-3 py-2">
        <p className="truncate text-sm font-bold text-slate-900">{title}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <LessonPlayer
          key={learnActivity.activityId}
          lessonId={view.data.lessonId}
          lessonTitle={view.data.lessonTitle || title}
          screens={view.data.screens}
          mode="preview"
          previewAudience="published"
          immersiveLayout
        />
      </div>
    </div>
  );
}
