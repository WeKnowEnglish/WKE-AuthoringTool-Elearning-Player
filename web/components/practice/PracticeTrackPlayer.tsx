"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { HomeworkFinishPanel, HomeworkProgressBar } from "@/components/primary/HomeworkPlayChrome";
import { recordStudioActivityHomeworkCompletion } from "@/lib/actions/class-homework";
import type { LearningTrackBeatPlan } from "@/lib/learning-tracks/parse-track-pack";
import type { LearningTrackLessonPlayerPack } from "@/lib/learning-tracks/parse-track-pack";
import {
  learningTrackPackToPlayerView,
  practiceSegmentIndexForScreen,
  resolvePracticeTrack,
  type PracticeTrackSegment,
} from "@/lib/practice-tracks";
import { acceptPrimaryRewardReceipt } from "@/lib/primary-player/client";
import {
  exitPracticeSessionIfOpen,
  startPracticeSession,
} from "@/lib/student-session";

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((module) => ({
      default: module.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-8 text-center text-sm font-semibold text-[var(--pl-muted)]">
        Loading practice track…
      </div>
    ),
  },
);

export type PracticeTrackPlayerMode =
  | "student"
  | "authoring-preview"
  | "pilot";

type Props = {
  pack: LearningTrackLessonPlayerPack;
  /** Stable lesson id for progress and telemetry. */
  lessonId?: string;
  mode?: PracticeTrackPlayerMode;
  homeworkId?: string;
  activityId?: string;
  title?: string;
  alreadyCompleted?: boolean;
  focusBeatId?: string | null;
  initialScreenIndex?: number;
  runSeed?: string;
  onScreenIndexChange?: (screenIndex: number) => void;
  onBeatFocus?: (beatId: string, screenIndex: number) => void;
};

function segmentBadge(segment: PracticeTrackSegment) {
  if (segment.gradingPolicy === "automatic") {
    return { label: "Quiz", className: "bg-sky-100 text-sky-800" };
  }
  if (segment.gradingPolicy === "completion") {
    return { label: "Practice", className: "bg-emerald-100 text-emerald-800" };
  }
  return { label: "Explore", className: "bg-stone-100 text-stone-700" };
}

export function PracticeTrackPlayer({
  pack,
  lessonId: lessonIdProp,
  mode = "student",
  homeworkId,
  activityId,
  title,
  alreadyCompleted = false,
  focusBeatId = null,
  initialScreenIndex = 0,
  runSeed,
  onScreenIndexChange,
  onBeatFocus,
}: Props) {
  const authoringPreview = mode === "authoring-preview";
  const assignedHomework = Boolean(homeworkId);
  const resolved = useMemo(() => resolvePracticeTrack(pack), [pack]);
  const lessonId =
    lessonIdProp ??
    (activityId ? `space-track-${activityId}` : `practice-track-${pack.id}`);
  const playerView = useMemo(
    () => learningTrackPackToPlayerView(pack, lessonId),
    [lessonId, pack],
  );
  const displayTitle = title?.trim() || playerView.lessonTitle;

  const [screenIndex, setScreenIndex] = useState(() => {
    if (focusBeatId) {
      const beat = pack.beat_plan.find((entry) => entry.id === focusBeatId);
      if (beat && beat.screenStart !== undefined) return beat.screenStart;
    }
    return Math.min(
      Math.max(0, initialScreenIndex),
      Math.max(0, playerView.screens.length - 1),
    );
  });
  const [playKey, setPlayKey] = useState(0);
  const [finished, setFinished] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(
    alreadyCompleted ? "saved" : null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const recordedRef = useRef(alreadyCompleted);
  const practiceSessionIdRef = useRef<string | null>(null);
  const exitPracticeSessionRef = useRef<(() => void) | null>(null);

  const activeSegmentIndex = practiceSegmentIndexForScreen(
    resolved.segments,
    screenIndex,
  );
  const activeSegment = resolved.segments[activeSegmentIndex] ?? resolved.segments[0];

  useEffect(() => {
    if (authoringPreview || assignedHomework) return;
    const started = startPracticeSession({
      activityId: lessonId,
      activityKind: "course_lesson",
      source: "student_hub",
      seed: runSeed ?? null,
      durationEstimateSec: pack.estimated_minutes * 60,
      scaffoldingLevel: "high",
    });
    practiceSessionIdRef.current = started.sessionId;
  }, [assignedHomework, authoringPreview, lessonId, pack.estimated_minutes, runSeed]);

  useEffect(() => {
    if (!focusBeatId) return;
    const beat = pack.beat_plan.find((entry) => entry.id === focusBeatId);
    if (!beat || beat.screenStart === undefined) return;
    setScreenIndex(beat.screenStart);
    setPlayKey((value) => value + 1);
  }, [focusBeatId, pack.beat_plan]);

  useEffect(() => {
    if (!finished || !assignedHomework || recordedRef.current) return;
    recordedRef.current = true;
    setSaving(true);
    setSaveError(null);
    void recordStudioActivityHomeworkCompletion({ homeworkId: homeworkId! }).then(
      (result) => {
        setSaving(false);
        if (!result.ok) {
          recordedRef.current = false;
          setSaveError(result.error);
          return;
        }
        setCompletedAt(result.finishedAt);
        if (result.rewardReceipt) acceptPrimaryRewardReceipt(result.rewardReceipt);
      },
    );
  }, [assignedHomework, finished, homeworkId]);

  const jumpToBeat = (beat: LearningTrackBeatPlan) => {
    const start = beat.screenStart ?? 0;
    setScreenIndex(start);
    setPlayKey((value) => value + 1);
    onBeatFocus?.(beat.id, start);
  };

  const handleScreenIndexChange = (nextIndex: number) => {
    setScreenIndex(nextIndex);
    onScreenIndexChange?.(nextIndex);
    const beat = pack.beat_plan.find(
      (entry) =>
        entry.screenStart !== undefined &&
        entry.screenEnd !== undefined &&
        nextIndex >= entry.screenStart &&
        nextIndex < entry.screenEnd,
    ) ?? pack.beat_plan.find(
      (entry) => entry.afterBridge?.screenIndex === nextIndex,
    );
    if (beat) onBeatFocus?.(beat.id, nextIndex);
  };

  const handleClosePracticeSession = () => {
    exitPracticeSessionRef.current?.();
    exitPracticeSessionRef.current = null;
    if (practiceSessionIdRef.current) {
      exitPracticeSessionIfOpen({ sessionId: practiceSessionIdRef.current });
      practiceSessionIdRef.current = null;
    }
  };

  if (!playerView.screens.length) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 text-sm font-semibold text-[var(--pl-muted)]">
        This practice track has no screens yet.
      </p>
    );
  }

  if (finished) {
    return (
      <HomeworkFinishPanel
        title="Nice work!"
        detail={`You finished ${displayTitle} (${playerView.screens.length} screen${
          playerView.screens.length === 1 ? "" : "s"
        }).`}
        saving={saving}
        saved={Boolean(completedAt)}
        saveError={saveError}
        retryLabel="Try again"
        onRetry={() => {
          setFinished(false);
          setPlayKey((value) => value + 1);
        }}
      />
    );
  }

  const lessonPlayerMode =
    authoringPreview || assignedHomework || mode === "pilot"
      ? "preview"
      : "student";
  const previewAudience =
    assignedHomework || mode === "pilot" ? "published" : "authoring";

  return (
    <div className="space-y-3">
      {assignedHomework && (alreadyCompleted || completedAt) ? (
        <p className="rounded-2xl border border-[var(--pl-success)]/30 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          You already finished this homework. You can still practice again.
        </p>
      ) : null}

      {resolved.segments.length > 1 ? (
        <nav
          className="flex gap-1 overflow-x-auto pb-1"
          aria-label="Practice track activities"
        >
          {resolved.segments.map((segment, index) => {
            const beat = pack.beat_plan[index];
            if (!beat) return null;
            const active = index === activeSegmentIndex;
            const visited =
              beat.screenEnd !== undefined && screenIndex >= beat.screenEnd;
            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => jumpToBeat(beat)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold ${
                  active
                    ? "border-sky-700 bg-sky-700 text-white"
                    : "border-stone-200 bg-white text-stone-700"
                }`}
              >
                {visited ? <Check className="h-3.5 w-3.5" /> : null}
                {index + 1}. {segment.label}
              </button>
            );
          })}
        </nav>
      ) : null}

      {activeSegment ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs font-extrabold uppercase tracking-wide text-sky-700">
            {activeSegment.label}
          </p>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              segmentBadge(activeSegment).className
            }`}
          >
            {segmentBadge(activeSegment).label}
          </span>
        </div>
      ) : null}

      <HomeworkProgressBar
        label="Practice track"
        current={Math.min(screenIndex + 1, playerView.screens.length)}
        total={playerView.screens.length}
      />

      <div className="min-h-[min(70dvh,560px)] overflow-hidden rounded-2xl border border-[var(--pl-border)] bg-white">
        <LessonPlayer
          key={`${playKey}:${lessonId}`}
          lessonId={lessonId}
          lessonTitle={displayTitle}
          screens={playerView.screens}
          mode={lessonPlayerMode}
          previewAudience={lessonPlayerMode === "preview" ? previewAudience : undefined}
          immersiveLayout
          initialScreenIndex={screenIndex}
          runSeed={runSeed}
          onPracticeSessionBind={(api) => {
            exitPracticeSessionRef.current = api.exitIfOpen;
          }}
          onScreenIndexChange={handleScreenIndexChange}
          onPreviewComplete={() => {
            handleClosePracticeSession();
            setFinished(true);
          }}
          onStudentComplete={() => {
            handleClosePracticeSession();
            if (!assignedHomework) {
              setFinished(true);
            }
          }}
        />
      </div>
    </div>
  );
}
