"use client";

import type { VirtualClassroomSessionHistoryItem } from "@/lib/virtual-classroom/session-history-types";

type Props = {
  sessions: VirtualClassroomSessionHistoryItem[];
};

function formatWhen(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : null;
  if (!Number.isFinite(start.getTime())) return "Unknown time";
  const startText = start.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!end || !Number.isFinite(end.getTime())) return startText;
  const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
  return `${startText} · ${durationMin} min`;
}

export function VirtualClassroomSessionHistory({ sessions }: Props) {
  if (!sessions.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Virtual Classroom history</h2>
        <p className="mt-1 text-sm text-slate-600">
          Past live sessions will appear here after you end a class.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Virtual Classroom history</h2>
        <p className="text-sm text-slate-600">
          Scheduled and extra sessions — held when at least one student joined.
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {sessions.map((session) => (
          <li
            key={session.sessionId}
            className="flex flex-wrap items-start justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{session.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatWhen(session.startedAt, session.endedAt)}
                {session.lessonTitle ? ` · ${session.lessonTitle}` : ""}
              </p>
              {session.occurrenceLabel ? (
                <p className="mt-1 text-xs font-medium text-teal-800">
                  {session.occurrenceLabel}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    session.sessionKind === "scheduled"
                      ? "bg-teal-100 text-teal-900"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {session.sessionKind === "scheduled" ? "Scheduled" : "Extra"}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    session.held
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {session.held ? "Held" : "No show"}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                  {session.studentsPresent} student
                  {session.studentsPresent === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <p className="font-mono text-xs text-slate-500">{session.joinCode}</p>
              <a
                href={`/teacher/virtual-classroom/${encodeURIComponent(session.sessionId)}/transcript`}
                className="rounded-lg border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-900 hover:bg-teal-100"
              >
                Transcript / report
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
