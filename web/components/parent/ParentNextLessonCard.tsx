"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CalendarDays } from "lucide-react";
import { formatWeeklySlotLabel } from "@/lib/class-schedule/next-meeting";
import { detectBrowserTimeZone } from "@/lib/class-schedule/timezone";
import type {
  ClassMeetingSlot,
  StudentNextClassMeeting,
} from "@/lib/class-schedule/types";

type Props = {
  classTitle: string | null;
  nextMeeting: StudentNextClassMeeting | null;
  slots: ClassMeetingSlot[];
};

function subscribe() {
  return () => undefined;
}

function viewerTimeZoneSnapshot(): string | null {
  return detectBrowserTimeZone();
}

function formatInZone(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ParentNextLessonCard({ classTitle, nextMeeting, slots }: Props) {
  const viewerTimeZone = useSyncExternalStore(
    subscribe,
    viewerTimeZoneSnapshot,
    () => null,
  );

  const viewerLabel = useMemo(() => {
    if (!nextMeeting || !viewerTimeZone) return null;
    if (viewerTimeZone === nextMeeting.timezone) return null;
    return formatInZone(nextMeeting.startsAt, viewerTimeZone);
  }, [nextMeeting, viewerTimeZone]);

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-white p-2.5 text-indigo-700 shadow-sm">
          <CalendarDays className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-800">
            Class schedule
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
            {classTitle ? classTitle : "Next lesson"}
          </h2>

          {nextMeeting ? (
            <div className="mt-3 space-y-1">
              <p className="text-sm font-extrabold text-slate-900">
                Next lesson: {nextMeeting.label}
              </p>
              <p className="text-xs font-semibold text-slate-600">
                Class timezone: {nextMeeting.timezone}
                {viewerLabel ? (
                  <>
                    {" "}
                    · Your time: {viewerLabel} ({viewerTimeZone})
                  </>
                ) : null}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
              {classTitle
                ? "No weekly class time is set yet. Ask the teacher if you are unsure when lessons meet."
                : "This child is not linked to an active class schedule yet."}
            </p>
          )}

          {slots.length > 0 ? (
            <ul className="mt-3 space-y-1 border-t border-indigo-100 pt-3">
              {slots.map((slot) => (
                <li key={slot.id} className="text-sm font-semibold text-slate-800">
                  {formatWeeklySlotLabel(slot)}
                  <span className="ml-2 text-xs font-medium text-slate-500">
                    ({slot.durationMinutes} min)
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
