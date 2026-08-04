"use client";

import { useEffect, useState, useTransition } from "react";
import { submitClassSchedulePreference } from "@/lib/actions/class-schedule-preferences";
import { formatWeeklySlotLabel } from "@/lib/class-schedule/next-meeting";
import type { ClassScheduleWindow } from "@/lib/class-schedule/preference-types";
import { detectBrowserTimeZone } from "@/lib/class-schedule/timezone";

type Props = {
  classId: string;
  studentId: string;
  classTitle: string | null;
  windows: ClassScheduleWindow[];
  initialRankedWindowIds: string[];
};

function windowLabel(window: ClassScheduleWindow): string {
  return formatWeeklySlotLabel({
    id: window.id,
    classId: window.classId,
    teacherId: window.teacherId,
    weekday: window.weekday,
    startTime: window.startTime,
    durationMinutes: window.durationMinutes,
    timezone: window.timezone,
  });
}

export function ParentSchedulePreferenceCard({
  classId,
  studentId,
  classTitle,
  windows,
  initialRankedWindowIds,
}: Props) {
  const [ranked, setRanked] = useState<string[]>(initialRankedWindowIds);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [viewerZone, setViewerZone] = useState<string | null>(null);

  useEffect(() => {
    setViewerZone(detectBrowserTimeZone());
  }, []);

  const toggle = (windowId: string) => {
    setRanked((current) => {
      if (current.includes(windowId)) {
        return current.filter((id) => id !== windowId);
      }
      return [...current, windowId];
    });
  };

  const move = (windowId: string, direction: -1 | 1) => {
    setRanked((current) => {
      const index = current.indexOf(windowId);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item!);
      return next;
    });
  };

  const submit = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await submitClassSchedulePreference({
        classId,
        studentId,
        rankedWindowIds: ranked,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Preferences saved. The teacher will choose the class time.");
    });
  };

  if (windows.length < 2) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-amber-900">
        Choose availability
      </p>
      <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
        {classTitle ? `${classTitle} · preferred times` : "Preferred class times"}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
        Tap the times that work for your family, then use up/down to rank them.
        First choice helps the teacher group the class.
        {viewerZone ? ` Times shown in class timezone (${windows[0]?.timezone}).` : null}
      </p>

      <ul className="mt-4 space-y-2">
        {windows.map((window) => {
          const selected = ranked.includes(window.id);
          const rank = selected ? ranked.indexOf(window.id) + 1 : null;
          return (
            <li
              key={window.id}
              className={`rounded-xl border bg-white p-3 ${
                selected ? "border-amber-400" : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggle(window.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block text-sm font-extrabold text-slate-900">
                    {rank ? `${rank}. ` : ""}
                    {windowLabel(window)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {window.durationMinutes} minutes
                  </span>
                </button>
                {selected ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => move(window.id, -1)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => move(window.id, 1)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold"
                    >
                      Down
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-500">Tap to add</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        disabled={isPending || ranked.length < 1}
        onClick={submit}
        className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
      >
        {isPending ? "Saving…" : "Save preferences"}
      </button>
      {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? (
        <p className="mt-2 text-sm font-semibold text-emerald-800">{message}</p>
      ) : null}
    </section>
  );
}
