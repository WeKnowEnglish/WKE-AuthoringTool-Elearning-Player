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
};

async function joinLiveSession(session: StudentClassLiveSession) {
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
  });

  return payload.sessionId;
}

export function ClassroomLiveNowJoin({ session, tone = "primary", compact = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSecondary = tone === "secondary";
  const shell = isSecondary
    ? "border-2 border-teal-800 bg-teal-50"
    : "border border-teal-200 bg-teal-50/90";
  const titleClass = "text-base font-extrabold text-teal-950";
  const muted = isSecondary ? "text-teal-900/80" : "text-teal-900/75";

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      const sessionId = await joinLiveSession(session);
      router.push(`/virtual-classroom/${sessionId}`);
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
            <p className="text-xs font-bold uppercase tracking-wide text-teal-800">Live now</p>
            <p className={`text-sm font-extrabold text-teal-950`}>{session.classTitle}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleJoin()}
            className="shrink-0 rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Joining…" : "Join class"}
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
      <h2 id="classroom-live-heading" className={titleClass}>Live now</h2>
      <p className={`mt-2 text-sm ${muted}`}>
        {session.classTitle} is live. Join your teacher&apos;s classroom session now.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleJoin()}
        className="mt-4 rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join live class"}
      </button>
      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-700" role="alert">{error}</p>
      ) : null}
    </section>
  );
}
