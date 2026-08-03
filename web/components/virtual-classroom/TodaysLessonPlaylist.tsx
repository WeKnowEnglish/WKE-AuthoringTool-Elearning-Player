"use client";

import { useEffect, useState } from "react";
import type {
  ClassLesson,
  ClassLessonStep,
  DocumentLessonStepConfig,
  LiveGameLessonStepConfig,
  StudioActivityLessonStepConfig,
  WhiteboardLessonStepConfig,
  WordCardsLessonStepConfig,
} from "@/lib/class-lessons/types";
import {
  CLASS_LESSON_PHASE_LABELS,
  CLASS_LESSON_STEP_KIND_LABELS,
} from "@/lib/class-lessons/types";
import type { DocumentLaunchPayload } from "@/components/document-activity/DocumentLaunchPanel";
import type { WhiteboardLaunchPayload } from "@/lib/whiteboard/launch-options";
import type { WordCardsLaunchPayload } from "@/components/word-cards/WordCardsLaunchPanel";

type Props = {
  sessionId: string;
  classId: string;
  busy: boolean;
  onLaunchWhiteboard: (payload: WhiteboardLaunchPayload) => void;
  onLaunchDocument: (payload: DocumentLaunchPayload) => void;
  onLaunchWordCards: (payload: WordCardsLaunchPayload) => void;
};

export function TodaysLessonPlaylist({
  sessionId,
  classId,
  busy,
  onLaunchWhiteboard,
  onLaunchDocument,
  onLaunchWordCards,
}: Props) {
  const [lesson, setLesson] = useState<ClassLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/virtual-classroom/${sessionId}/lesson`)
      .then(async (response) => {
        const payload = (await response.json()) as {
          error?: string;
          lesson?: ClassLesson | null;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load lesson.");
        }
        if (!cancelled) {
          setLesson(payload.lesson ?? null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load lesson.");
          setLesson(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
        Loading today’s lesson…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
        {error}
      </div>
    );
  }

  if (!lesson || lesson.steps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600">
        No staged lesson bound. Start the classroom from the Teach tab with a Ready lesson, or
        launch activities below.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
          Today’s lesson
        </p>
        <h3 className="text-base font-bold text-slate-900">{lesson.title}</h3>
        {lesson.notes ? (
          <p className="mt-1 text-xs text-slate-600">{lesson.notes}</p>
        ) : null}
      </div>
      <ol className="space-y-2">
        {lesson.steps.map((step, index) => (
          <li
            key={step.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/80 bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {index + 1}. {CLASS_LESSON_PHASE_LABELS[step.phase]} · {step.durationMinutes} min ·{" "}
                {CLASS_LESSON_STEP_KIND_LABELS[step.kind]}
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">{step.title}</p>
              {step.studentAction ? (
                <p className="mt-0.5 text-xs text-slate-600">Students: {step.studentAction}</p>
              ) : null}
              {step.teacherAction ? (
                <p className="mt-0.5 text-xs text-slate-500">Teacher: {step.teacherAction}</p>
              ) : null}
            </div>
            <LaunchStepButton
              step={step}
              classId={classId}
              busy={busy}
              onLaunchWhiteboard={onLaunchWhiteboard}
              onLaunchDocument={onLaunchDocument}
              onLaunchWordCards={onLaunchWordCards}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function LaunchStepButton({
  step,
  classId,
  busy,
  onLaunchWhiteboard,
  onLaunchDocument,
  onLaunchWordCards,
}: {
  step: ClassLessonStep;
  classId: string;
  busy: boolean;
  onLaunchWhiteboard: (payload: WhiteboardLaunchPayload) => void;
  onLaunchDocument: (payload: DocumentLaunchPayload) => void;
  onLaunchWordCards: (payload: WordCardsLaunchPayload) => void;
}) {
  if (step.kind === "custom") {
    return (
      <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
        No launch needed
      </span>
    );
  }

  if (step.kind === "studio_activity") {
    const config = step.config as StudioActivityLessonStepConfig;
    return (
      <a
        href={config.playPath}
        target="_blank"
        rel="noreferrer"
        className={`rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white ${
          busy ? "pointer-events-none opacity-50" : "hover:bg-teal-800"
        }`}
      >
        Open activity
      </a>
    );
  }

  if (step.kind === "live_game") {
    const config = step.config as LiveGameLessonStepConfig;
    const params = new URLSearchParams();
    if (classId) params.set("classId", classId);
    if (config.questionSetId) params.set("questionSetId", config.questionSetId);
    const href = `/live-game/host?${params.toString()}`;
    return (
      <a
        href={href}
        className={`rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white ${
          busy ? "pointer-events-none opacity-50" : "hover:bg-emerald-800"
        }`}
      >
        Open Live Game
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (step.kind === "whiteboard") {
          onLaunchWhiteboard(step.config as WhiteboardLessonStepConfig);
          return;
        }
        if (step.kind === "document") {
          onLaunchDocument(step.config as DocumentLessonStepConfig);
          return;
        }
        if (step.kind === "word_cards") {
          onLaunchWordCards(step.config as WordCardsLessonStepConfig);
        }
      }}
      className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
    >
      Launch
    </button>
  );
}
