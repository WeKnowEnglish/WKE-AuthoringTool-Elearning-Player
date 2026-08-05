"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import type { ClassLesson } from "@/lib/class-lessons/types";
import type { ClassLiveState } from "@/lib/class-schedule/live-state-types";
import { setVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";

type Props = {
  classId: string;
  archived: boolean;
  activeSession?: {
    sessionId: string;
    joinCode: string;
    classLessonId?: string | null;
  } | null;
  readyLessons?: ClassLesson[];
};

type HostMode = "early" | "live" | "extra";

export function VirtualClassroomClassPanel({
  classId,
  archived,
  activeSession,
  readyLessons = [],
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<ClassLiveState | null>(null);
  const defaultLessonId = readyLessons[0]?.id ?? "";
  const [selectedLessonId, setSelectedLessonId] = useState(defaultLessonId);

  const refreshLiveState = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/virtual-classroom/class/${encodeURIComponent(classId)}/live-state`,
      );
      if (!res.ok) return;
      setLiveState((await res.json()) as ClassLiveState);
    } catch {
      // ignore
    }
  }, [classId]);

  useEffect(() => {
    void refreshLiveState();
    const id = window.setInterval(() => void refreshLiveState(), 30_000);
    return () => window.clearInterval(id);
  }, [refreshLiveState]);

  const boundLessonTitle = useMemo(() => {
    const lessonId = activeSession?.classLessonId;
    if (!lessonId) return null;
    return (
      readyLessons.find((lesson) => lesson.id === lessonId)?.title ?? "Staged lesson"
    );
  }, [activeSession?.classLessonId, readyLessons]);

  const host = async (mode: HostMode) => {
    setBusy(true);
    setError(null);
    try {
      const classLessonId = selectedLessonId.trim() || null;
      const response = await diagnosticFetch(
        `/api/virtual-classroom/class/${classId}/host`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Virtual Classroom",
            classLessonId,
            mode,
          }),
        },
        {
          phase: "classroom",
          name: "vc.class_host",
          detail: { activity: "classroom", commandType: "CLASS_HOST", mode },
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        joinCode?: string;
        roomId?: string;
        classId?: string;
        classLessonId?: string | null;
        userId?: string;
        displayName?: string;
        classPhase?: string;
      };
      if (
        !response.ok ||
        !payload.sessionId ||
        !payload.joinCode ||
        !payload.roomId ||
        !payload.userId
      ) {
        throw new Error(payload.error ?? "Could not start Virtual Classroom.");
      }
      setVirtualClassroomContext({
        sessionId: payload.sessionId,
        joinCode: payload.joinCode,
        roomId: payload.roomId,
        classId: payload.classId ?? classId,
        classLessonId: payload.classLessonId ?? classLessonId,
        role: "host",
        userId: payload.userId,
        displayName: payload.displayName ?? "Teacher",
        returnHref: `/teacher/classes/${encodeURIComponent(classId)}`,
      });
      const path =
        payload.classPhase === "waiting" || payload.classPhase === "prep"
          ? `/teacher/virtual-classroom/${payload.sessionId}`
          : `/teacher/virtual-classroom/${payload.sessionId}`;
      router.push(path);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    const sessionId = liveState?.sessionId ?? activeSession?.sessionId;
    if (!sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/virtual-classroom/${sessionId}/restore`,
        { method: "POST" },
      );
      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        joinCode?: string;
        roomId?: string;
        classId?: string;
        classLessonId?: string | null;
        userId?: string;
        displayName?: string;
      };
      if (
        !response.ok ||
        !payload.sessionId ||
        !payload.joinCode ||
        !payload.roomId ||
        !payload.userId
      ) {
        throw new Error(payload.error ?? "Could not reopen session.");
      }
      setVirtualClassroomContext({
        sessionId: payload.sessionId,
        joinCode: payload.joinCode,
        roomId: payload.roomId,
        classId: payload.classId ?? classId,
        classLessonId: payload.classLessonId ?? activeSession?.classLessonId ?? null,
        role: "host",
        userId: payload.userId,
        displayName: payload.displayName ?? "Teacher",
        returnHref: `/teacher/classes/${encodeURIComponent(classId)}`,
      });
      router.push(`/teacher/virtual-classroom/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const phaseLabel =
    liveState?.phase === "waiting"
      ? "Waiting room open"
      : liveState?.phase === "live"
        ? liveState.kind === "extra"
          ? "Extra session live"
          : "Class live"
        : liveState?.phase === "idle"
          ? "Scheduled — not open yet"
          : liveState?.phase === "ended"
            ? "Occurrence ended"
            : "No upcoming slot";

  const joinCode = liveState?.joinCode ?? activeSession?.joinCode;

  return (
    <section className="space-y-3 rounded-xl border border-teal-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Virtual Classroom</h2>
        <p className="text-sm text-slate-600">
          Prepare a Ready lesson anytime. Open the classroom early for prep, or start now.
          Scheduled classes auto-open a waiting room 15 minutes before class and go live at
          5 minutes before.
        </p>
      </div>

      {liveState ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p>
            <span className="font-bold">{phaseLabel}</span>
            {liveState.occurrenceLabel ? (
              <> · {liveState.occurrenceLabel}</>
            ) : null}
            {liveState.kind === "extra" ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                Extra session
              </span>
            ) : null}
            {liveState.kind === "scheduled" ? (
              <span className="ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-xs font-bold text-teal-900">
                Scheduled
              </span>
            ) : null}
          </p>
          {liveState.phase === "idle" && liveState.waitingOpensAt ? (
            <p className="mt-1 text-xs text-slate-500">
              Waiting opens{" "}
              {new Date(liveState.waitingOpensAt).toLocaleString()} · Auto-live{" "}
              {liveState.autoLiveAt
                ? new Date(liveState.autoLiveAt).toLocaleString()
                : "—"}
            </p>
          ) : null}
        </div>
      ) : null}

      {archived ? (
        <p className="text-sm text-amber-800">Unarchive the class to start a session.</p>
      ) : (
        <>
          <label className="block text-sm font-semibold text-slate-800">
            Today’s lesson (optional)
            <select
              value={selectedLessonId}
              disabled={busy}
              onChange={(event) => setSelectedLessonId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"
            >
              <option value="">No staged lesson</option>
              {readyLessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title} ({lesson.steps.length} step
                  {lesson.steps.length === 1 ? "" : "s"})
                </option>
              ))}
            </select>
          </label>

          {joinCode ? (
            <p className="text-sm text-slate-700">
              Session code{" "}
              <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-white">
                {joinCode}
              </span>
              {boundLessonTitle ? (
                <>
                  {" "}
                  · Lesson <span className="font-semibold">{boundLessonTitle}</span>
                </>
              ) : null}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {joinCode ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void reopen()}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Opening…" : "Open session"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy || archived}
              onClick={() => void host("early")}
              className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-bold text-teal-900 disabled:opacity-50"
            >
              {busy ? "…" : "Open classroom early"}
            </button>
            <button
              type="button"
              disabled={busy || archived}
              onClick={() => void host("live")}
              className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "…" : "Start class now"}
            </button>
            <button
              type="button"
              disabled={busy || archived}
              onClick={() => void host("extra")}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50"
            >
              {busy ? "…" : "Start extra session"}
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </>
      )}
    </section>
  );
}
