"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import type { ClassLesson } from "@/lib/class-lessons/types";
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

export function VirtualClassroomClassPanel({
  classId,
  archived,
  activeSession,
  readyLessons = [],
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultLessonId = readyLessons[0]?.id ?? "";
  const [selectedLessonId, setSelectedLessonId] = useState(defaultLessonId);

  const boundLessonTitle = useMemo(() => {
    if (!activeSession?.classLessonId) return null;
    return (
      readyLessons.find((lesson) => lesson.id === activeSession.classLessonId)?.title ??
      "Staged lesson"
    );
  }, [activeSession?.classLessonId, readyLessons]);

  const start = async () => {
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
          }),
        },
        {
          phase: "classroom",
          name: "vc.class_host",
          detail: { activity: "classroom", commandType: "CLASS_HOST" },
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
        role?: "host" | "member";
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
      });
      router.push(`/teacher/virtual-classroom/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const reopen = async () => {
    if (!activeSession) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/virtual-classroom/${activeSession.sessionId}/restore`,
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
        classLessonId: payload.classLessonId ?? activeSession.classLessonId ?? null,
        role: "host",
        userId: payload.userId,
        displayName: payload.displayName ?? "Teacher",
      });
      router.push(`/teacher/virtual-classroom/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-teal-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Virtual Classroom</h2>
        <p className="text-sm text-slate-600">
          Host a live class session. Students join at{" "}
          <code className="rounded bg-slate-100 px-1">/virtual-classroom/join</code>. Use End
          session for all to disconnect everyone.
        </p>
      </div>

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
          {readyLessons.length === 0 ? (
            <p className="text-xs text-slate-500">
              Mark a lesson Ready on the Create Lesson tab to bind a playlist when you go live.
            </p>
          ) : null}

          {activeSession ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                Live session code{" "}
                <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-white">
                  {activeSession.joinCode}
                </span>
                {boundLessonTitle ? (
                  <>
                    {" "}
                    · Lesson <span className="font-semibold">{boundLessonTitle}</span>
                  </>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void reopen()}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy ? "Opening…" : "Open live session"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void start()}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50"
                >
                  {busy ? "Starting…" : "Start new session"}
                </button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          ) : (
            <div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void start()}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Starting…" : "Start Virtual Classroom"}
              </button>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
