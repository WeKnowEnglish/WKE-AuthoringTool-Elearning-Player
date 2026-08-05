"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionAttendanceSummary } from "@/lib/virtual-classroom/server/attendance-summary";

type LiveMember = { id: string; name: string };

type Props = {
  sessionId: string;
  classId: string;
  liveMembers: LiveMember[];
};

const PRESENCE_LABEL: Record<
  SessionAttendanceSummary["participants"][number]["presence"],
  string
> = {
  absent: "Absent",
  lobby: "Waiting",
  video: "On video",
  left: "Left",
};

const PRESENCE_CLASS: Record<
  SessionAttendanceSummary["participants"][number]["presence"],
  string
> = {
  absent: "bg-slate-100 text-slate-600",
  lobby: "bg-amber-100 text-amber-900",
  video: "bg-emerald-100 text-emerald-900",
  left: "bg-slate-200 text-slate-700",
};

export function SessionAttendancePanel({ sessionId, classId, liveMembers }: Props) {
  const [summary, setSummary] = useState<SessionAttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liveIds = useMemo(() => new Set(liveMembers.map((m) => m.id)), [liveMembers]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/virtual-classroom/${encodeURIComponent(sessionId)}/attendance`,
        );
        const payload = (await res.json()) as SessionAttendanceSummary & { error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Could not load attendance.");
        if (!cancelled) {
          setSummary(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load.");
        }
      }
    };

    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId]);

  const participants = useMemo(() => {
    if (!summary) return [];
    return [...summary.participants].sort((a, b) => {
      const order = { video: 0, lobby: 1, left: 2, absent: 3 } as const;
      const diff = order[a.presence] - order[b.presence];
      if (diff !== 0) return diff;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [summary]);

  const inClassroom = liveMembers.length;

  return (
    <section aria-labelledby="vc-attendance-heading">
      <h2 id="vc-attendance-heading" className="text-sm font-semibold text-slate-900">
        Attendance
      </h2>
      <p className="mt-1 text-[11px] text-slate-600">
        {summary
          ? `${summary.presentVideo} on video · ${summary.presentLobby} waiting`
          : "Loading…"}
        {summary?.rosterTotal != null
          ? ` · ${summary.rosterTotal} enrolled`
          : null}
        {inClassroom > 0 ? ` · ${inClassroom} in classroom` : null}
      </p>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm text-slate-700">
        {participants.map((p) => {
          const inLive = p.userId ? liveIds.has(p.userId) : liveIds.has(p.participantKey);
          return (
            <li key={p.participantKey} className="flex items-start justify-between gap-2">
              <span className="min-w-0 truncate">
                {p.displayName}
                {!p.onRoster ? (
                  <span className="ml-1 text-[10px] font-semibold text-violet-700">
                    guest
                  </span>
                ) : null}
                {inLive ? (
                  <span className="ml-1 text-[10px] font-semibold text-teal-700">
                    in room
                  </span>
                ) : null}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRESENCE_CLASS[p.presence]}`}
              >
                {PRESENCE_LABEL[p.presence]}
              </span>
            </li>
          );
        })}
        {!participants.length && !error ? (
          <li className="text-xs text-slate-500">
            {classId ? "No enrolled students yet." : "No participants yet."}
          </li>
        ) : null}
      </ul>
    </section>
  );
}
