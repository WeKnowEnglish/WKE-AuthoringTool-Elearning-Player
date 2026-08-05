"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Radio } from "lucide-react";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import { setVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";
import type { StudentClassLiveSession } from "@/lib/student-live/types";

type Tone = "primary" | "secondary";

type Props = {
  session?: StudentClassLiveSession | null;
  tone?: Tone;
};

function classReturnHref(session: StudentClassLiveSession, tone: Tone): string {
  const base = tone === "secondary" ? "/secondary/class" : "/primary/class";
  return `${base}/${encodeURIComponent(session.classId)}`;
}

async function joinLiveSession(session: StudentClassLiveSession, returnHref: string) {
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

  return session.landingPath;
}

/** Compact header control: Waiting / Live Now / Not Live. */
export function ClassroomLiveStatusButton({ session = null, tone = "primary" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOpen = Boolean(session);
  const isWaiting = session?.phase === "waiting";

  if (!isOpen || !session) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-rose-700 sm:text-xs"
        title="Class is not live right now"
      >
        <span className="h-2 w-2 rounded-full bg-rose-400" aria-hidden />
        Not Live
      </span>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              const path = await joinLiveSession(session, classReturnHref(session, tone));
              router.push(path);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Join failed.");
            } finally {
              setBusy(false);
            }
          })();
        }}
        className={`group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm transition disabled:opacity-70 sm:px-3.5 sm:text-xs ${
          isWaiting
            ? "border-amber-400 bg-amber-500 hover:bg-amber-600"
            : "border-emerald-400 bg-emerald-500 hover:bg-emerald-600"
        }`}
        aria-label={
          isWaiting ? "Waiting room open — enter now" : "Class is live — join now"
        }
      >
        <span
          className={`pointer-events-none absolute inset-0 animate-pulse ${
            isWaiting ? "bg-amber-300/40" : "bg-emerald-300/40"
          }`}
          aria-hidden
        />
        <span className="relative flex h-2.5 w-2.5 items-center justify-center" aria-hidden>
          <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-white/80" />
          <span className="relative h-2 w-2 rounded-full bg-white" />
        </span>
        <Radio className="relative h-3.5 w-3.5" aria-hidden />
        <span className="relative">
          {busy ? "Joining…" : isWaiting ? "Waiting" : "Live Now"}
        </span>
      </button>
      {error ? (
        <p
          className="absolute right-0 top-full z-10 mt-1 w-max max-w-[14rem] rounded-lg bg-rose-700 px-2 py-1 text-[10px] font-semibold text-white shadow"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
