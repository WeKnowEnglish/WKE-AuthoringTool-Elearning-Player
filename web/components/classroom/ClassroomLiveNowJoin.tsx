"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import { setVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";
import type { StudentClassLiveSession } from "@/lib/student-live/types";

type Tone = "primary" | "secondary";

type Props = {
  session: StudentClassLiveSession;
  tone?: Tone;
  /** Compact single-line layout for home strips. */
  compact?: boolean;
  /** Hub class URL for leave / session-ended return. */
  returnHref?: string;
};

function defaultClassReturnHref(session: StudentClassLiveSession, tone: Tone): string {
  const base = tone === "secondary" ? "/secondary/class" : "/primary/class";
  return `${base}/${encodeURIComponent(session.classId)}`;
}

async function joinLiveSession(
  session: StudentClassLiveSession,
  returnHref: string,
) {
  const response = await diagnosticFetch(
    "/api/virtual-classroom/join",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ joinCode: session.joinCode }),
    },
    {
      phase: "join",
      name: "vc.student_join",
      detail: {
        activity: "classroom",
        commandType: "JOIN",
        sessionId: session.sessionId,
        classId: session.classId,
      },
    },
  );

  const payload = (await response.json()) as {
    error?: string;
    sessionId?: string;
    joinCode?: string;
    roomId?: string;
    classId?: string | null;
    userId?: string;
    displayName?: string;
    landing?: "waiting" | "live";
  };

  if (
    !response.ok ||
    !payload.sessionId ||
    !payload.joinCode ||
    !payload.roomId ||
    !payload.userId
  ) {
    throw new Error(payload.error ?? "Could not join live class.");
  }

  setVirtualClassroomContext({
    sessionId: payload.sessionId,
    joinCode: payload.joinCode,
    roomId: payload.roomId,
    classId: payload.classId ?? session.classId,
    role: "member",
    userId: payload.userId,
    displayName: payload.displayName ?? "Student",
    returnHref,
  });

  return {
    sessionId: payload.sessionId,
    path:
      payload.landing === "waiting" || session.phase === "waiting"
        ? session.landingPath
        : `/virtual-classroom/${payload.sessionId}`,
  };
}

export function ClassroomLiveNowJoin({
  session,
  tone = "primary",
  compact = false,
  returnHref,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hubHref = returnHref ?? defaultClassReturnHref(session, tone);

  const isSecondary = tone === "secondary";
  const isWaiting = session.phase === "waiting";
  const shell = isSecondary
    ? "border-2 border-teal-800 bg-teal-50"
    : isWaiting
      ? "border border-amber-300 bg-amber-50/90"
      : "border border-teal-200 bg-teal-50/90";
  const titleClass = "text-base font-extrabold text-teal-950";
  const muted = isSecondary ? "text-teal-900/80" : "text-teal-900/75";
  const eyebrow = isWaiting ? "Waiting room" : "Live now";
  const cta = isWaiting ? "Enter waiting room" : "Join class";

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await joinLiveSession(session, hubHref);
      router.push(result.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed.");
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <div className={`rounded-xl ${shell} p-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-800">
              {eyebrow}
            </p>
            <p className="text-sm font-extrabold text-teal-950">{session.classTitle}</p>
            {session.occurrenceLabel ? (
              <p className="text-[11px] font-semibold text-teal-900/70">
                {session.occurrenceLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleJoin()}
            className="shrink-0 rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Joining…" : cta}
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <section className={`rounded-xl ${shell} p-5 sm:p-6`} aria-labelledby="classroom-live-heading">
      <h2 id="classroom-live-heading" className={titleClass}>
        {eyebrow}
      </h2>
      <p className={`mt-2 text-sm ${muted}`}>
        {isWaiting
          ? `${session.classTitle} waiting room is open. Class goes live 5 minutes before the scheduled start.`
          : `${session.classTitle} is live. Join your teacher's classroom session now.`}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleJoin()}
        className="mt-4 rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Joining…" : isWaiting ? "Enter waiting room" : "Join live class"}
      </button>
      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-700" role="alert">{error}</p>
      ) : null}
    </section>
  );
}
