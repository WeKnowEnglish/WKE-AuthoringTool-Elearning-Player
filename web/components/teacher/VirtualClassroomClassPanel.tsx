"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import { setVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";

type Props = {
  classId: string;
  archived: boolean;
  activeSession?: {
    sessionId: string;
    joinCode: string;
  } | null;
};

export function VirtualClassroomClassPanel({ classId, archived, activeSession }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await diagnosticFetch(
        `/api/virtual-classroom/class/${classId}/host`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Virtual Classroom" }),
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
      ) : activeSession ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">
            Live session code{" "}
            <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-white">
              {activeSession.joinCode}
            </span>
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
    </section>
  );
}
