"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLobbyPresence } from "@/components/virtual-classroom/useLobbyPresence";
import {
  clearVirtualClassroomContext,
  getVirtualClassroomContext,
} from "@/lib/virtual-classroom/client-context";
import { resolveVirtualClassroomExitHref } from "@/lib/virtual-classroom/exit-href";
import type { WaitingRoomState } from "@/lib/virtual-classroom/session-history-types";

type Props = {
  sessionId: string;
  classTitle?: string | null;
  occurrenceLabel?: string | null;
  autoLiveAt?: string | null;
  initialState?: WaitingRoomState | null;
};

/**
 * Waiting-room landing before class goes live (T−15 → T−5).
 * Styled to match Primary/Secondary class hub (teal shell).
 */
export function VirtualClassroomWaitingClient({
  sessionId,
  classTitle,
  occurrenceLabel,
  autoLiveAt,
  initialState = null,
}: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [leaveHref, setLeaveHref] = useState("/virtual-classroom/join");
  const [roomState, setRoomState] = useState<WaitingRoomState | null>(initialState);

  useLobbyPresence(sessionId);

  useEffect(() => {
    const ctx = getVirtualClassroomContext();
    setLeaveHref(
      resolveVirtualClassroomExitHref({
        role: ctx?.role === "host" ? "host" : "member",
        classId: ctx?.classId,
        returnHref: ctx?.returnHref,
      }),
    );
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch(
          `/api/virtual-classroom/${encodeURIComponent(sessionId)}/waiting-state`,
        );
        if (!res.ok) return;
        const payload = (await res.json()) as WaitingRoomState;
        if (!cancelled) setRoomState(payload);
      } catch {
        // ignore
      }
    };

    void refresh();
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId]);

  const liveAtMs = roomState?.autoLiveAt ?? autoLiveAt;
  useEffect(() => {
    if (!liveAtMs) return;
    const liveAt = new Date(liveAtMs).getTime();
    if (!Number.isFinite(liveAt)) return;
    if (now >= liveAt || roomState?.phase === "live") {
      router.replace(`/virtual-classroom/${encodeURIComponent(sessionId)}`);
    }
  }, [liveAtMs, now, router, roomState?.phase, sessionId]);

  const msLeft = liveAtMs
    ? Math.max(0, new Date(liveAtMs).getTime() - now)
    : null;
  const mins = msLeft != null ? Math.ceil(msLeft / 60_000) : null;
  const secs =
    msLeft != null && msLeft < 60_000 ? Math.ceil(msLeft / 1000) : null;

  const title = roomState?.classTitle ?? classTitle;
  const slotLabel = roomState?.occurrenceLabel ?? occurrenceLabel;
  const teacherPresent = roomState?.teacherPresent ?? false;
  const classmatesWaiting = roomState?.classmatesWaiting ?? 0;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-teal-50 to-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 p-6">
        <div className="rounded-2xl border border-teal-200 bg-white/95 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-800">
            Waiting room
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {title?.trim() || "Class starting soon"}
          </h1>
          {slotLabel ? (
            <p className="mt-2 text-sm font-semibold text-teal-900/80">{slotLabel}</p>
          ) : null}

          <div className="mt-4 space-y-3">
            <p
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                teacherPresent
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {teacherPresent
                ? "Your teacher is in the classroom — class will start soon."
                : "Your teacher has not joined yet. Stay here — the room opens automatically."}
            </p>

            {classmatesWaiting > 0 ? (
              <p className="rounded-xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm font-semibold text-teal-950">
                {classmatesWaiting === 1
                  ? "1 classmate is waiting with you."
                  : `${classmatesWaiting} classmates are waiting with you.`}
              </p>
            ) : null}

            {msLeft != null && msLeft > 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
                Goes live in{" "}
                {mins != null && mins > 0
                  ? `${mins} min`
                  : secs != null
                    ? `${secs} sec`
                    : "soon"}
              </p>
            ) : null}
          </div>

          <p className="mt-4 text-sm text-slate-600">
            You&apos;re checked in. The live classroom opens 5 minutes before class starts.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                router.push(`/virtual-classroom/${encodeURIComponent(sessionId)}`)
              }
              className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-900"
            >
              Enter classroom early
            </button>
            <Link
              href={leaveHref}
              onClick={() => clearVirtualClassroomContext()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Back to class
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
