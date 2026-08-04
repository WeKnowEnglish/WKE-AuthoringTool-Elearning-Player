"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  lockClassScheduleFromWindow,
  saveClassScheduleWindows,
  setPreferenceCollectionOpen,
} from "@/lib/actions/class-schedule-preferences";
import { formatWeeklySlotLabel } from "@/lib/class-schedule/next-meeting";
import {
  CLASS_MEETING_WEEKDAYS,
  CLASS_MEETING_WEEKDAY_LABELS,
  DEFAULT_CLASS_MEETING_TIMEZONE,
  type ClassMeetingWeekday,
} from "@/lib/class-schedule/types";
import type {
  ClassScheduleGroupingBoard,
  ClassScheduleWindow,
} from "@/lib/class-schedule/preference-types";
import {
  classScheduleTimezoneOptions,
  detectBrowserTimeZone,
} from "@/lib/class-schedule/timezone";
import type { ClassRosterStudent } from "@/lib/data/teacher-classes";

type DraftWindow = {
  weekday: ClassMeetingWeekday;
  startTime: string;
  durationMinutes: number;
};

type Props = {
  classId: string;
  archived: boolean;
  roster: ClassRosterStudent[];
  initialBoard: ClassScheduleGroupingBoard;
};

function emptyDraft(): DraftWindow {
  return { weekday: 2, startTime: "16:00", durationMinutes: 60 };
}

function windowAsSlot(window: ClassScheduleWindow) {
  return {
    id: window.id,
    classId: window.classId,
    teacherId: window.teacherId,
    weekday: window.weekday,
    startTime: window.startTime,
    durationMinutes: window.durationMinutes,
    timezone: window.timezone,
  };
}

export function ClassScheduleGroupingPanel({
  classId,
  archived,
  roster,
  initialBoard,
}: Props) {
  const router = useRouter();
  const [board, setBoard] = useState(initialBoard);
  const [timezone, setTimezone] = useState(
    initialBoard.windows[0]?.timezone ?? DEFAULT_CLASS_MEETING_TIMEZONE,
  );
  const [drafts, setDrafts] = useState<DraftWindow[]>(() =>
    initialBoard.windows.length
      ? initialBoard.windows.map((window) => ({
          weekday: window.weekday,
          startTime: window.startTime,
          durationMinutes: window.durationMinutes,
        }))
      : [emptyDraft(), emptyDraft()],
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [detectedZone, setDetectedZone] = useState<string | null>(null);
  const disabled = archived || isPending;

  // Detect after mount — SSR and client Intl zones can differ (e.g. Asia/Saigon vs Bangkok).
  useEffect(() => {
    setDetectedZone(detectBrowserTimeZone());
  }, []);

  const timezoneOptions = useMemo(
    () => classScheduleTimezoneOptions(detectedZone),
    [detectedZone],
  );

  const rosterById = useMemo(
    () => new Map(roster.map((student) => [student.studentId, student])),
    [roster],
  );

  const persistWindows = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveClassScheduleWindows({
        classId,
        timezone,
        windows: drafts,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBoard((current) => ({
        ...current,
        windows: result.windows,
        preferences: [],
        firstChoiceCounts: {},
      }));
      setMessage("Time options saved. Preferences were cleared for the new options.");
      router.refresh();
    });
  };

  const toggleOpen = (open: boolean) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setPreferenceCollectionOpen({ classId, open });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBoard((current) => ({ ...current, preferenceCollectionOpen: open }));
      setMessage(
        open
          ? "Preference collection is open for linked parents."
          : "Preference collection closed.",
      );
      router.refresh();
    });
  };

  const lockWindow = (windowId: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await lockClassScheduleFromWindow({ classId, windowId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBoard((current) => ({
        ...current,
        preferenceCollectionOpen: false,
      }));
      setMessage("Schedule locked. Confirmed weekly meeting time updated.");
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
        Forming class · Slice B
      </p>
      <h2 className="mt-1 text-lg font-bold text-neutral-900">
        Parent time preferences
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        Offer 2–6 possible weekly times. Linked parents rank their availability.
        When you lock a time, it becomes the confirmed class schedule.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || board.windows.length < 2}
          onClick={() => toggleOpen(!board.preferenceCollectionOpen)}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {board.preferenceCollectionOpen
            ? "Close preference collection"
            : "Open preference collection"}
        </button>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            board.preferenceCollectionOpen
              ? "bg-emerald-100 text-emerald-900"
              : "bg-neutral-200 text-neutral-700"
          }`}
        >
          {board.preferenceCollectionOpen ? "Collecting" : "Closed"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-neutral-800">
          Options timezone
          <select
            value={timezone}
            disabled={disabled}
            onChange={(event) => setTimezone(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal"
          >
            {timezoneOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="mt-3 space-y-2">
        {drafts.map((draft, index) => (
          <li
            key={index}
            className="grid gap-2 rounded-lg border border-neutral-200 bg-white p-3 sm:grid-cols-4"
          >
            <label className="block text-xs font-semibold text-neutral-700">
              Day
              <select
                value={draft.weekday}
                disabled={disabled}
                onChange={(event) => {
                  const weekday = Number(event.target.value) as ClassMeetingWeekday;
                  setDrafts((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, weekday } : row,
                    ),
                  );
                }}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
              >
                {(CLASS_MEETING_WEEKDAYS as readonly ClassMeetingWeekday[]).map(
                  (weekday) => (
                    <option key={weekday} value={weekday}>
                      {CLASS_MEETING_WEEKDAY_LABELS[weekday]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block text-xs font-semibold text-neutral-700">
              Start
              <input
                type="time"
                value={draft.startTime}
                disabled={disabled}
                onChange={(event) => {
                  const startTime = event.target.value;
                  setDrafts((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, startTime } : row,
                    ),
                  );
                }}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-neutral-700">
              Minutes
              <input
                type="number"
                min={15}
                max={240}
                step={15}
                value={draft.durationMinutes}
                disabled={disabled}
                onChange={(event) => {
                  const durationMinutes = Number(event.target.value);
                  setDrafts((current) =>
                    current.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, durationMinutes } : row,
                    ),
                  );
                }}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={disabled || drafts.length <= 2}
                onClick={() =>
                  setDrafts((current) =>
                    current.filter((_, rowIndex) => rowIndex !== index),
                  )
                }
                className="w-full rounded-lg border border-red-200 px-2 py-2 text-xs font-bold text-red-700 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || drafts.length >= 6}
          onClick={() => setDrafts((current) => [...current, emptyDraft()])}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Add option
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={persistWindows}
          className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save time options"}
        </button>
      </div>

      {board.windows.length > 0 ? (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-bold text-neutral-900">Grouping board</h3>
          <p className="text-xs font-semibold text-neutral-600">
            {board.preferences.length} of {roster.length} families submitted · counts
            use each family&apos;s first choice
          </p>
          <ul className="space-y-2">
            {board.windows.map((window) => {
              const firstChoice = board.firstChoiceCounts[window.id] ?? 0;
              const supporters = board.preferences.filter(
                (preference) => preference.rankedWindowIds[0] === window.id,
              );
              return (
                <li
                  key={window.id}
                  className="rounded-lg border border-neutral-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-neutral-900">
                        {formatWeeklySlotLabel(windowAsSlot(window))}
                        <span className="ml-2 text-xs font-medium text-neutral-500">
                          ({window.durationMinutes} min)
                        </span>
                      </p>
                      <p className="mt-1 text-xs font-semibold text-neutral-600">
                        First choice: {firstChoice}
                      </p>
                      {supporters.length > 0 ? (
                        <p className="mt-1 text-xs text-neutral-600">
                          {supporters
                            .map(
                              (preference) =>
                                rosterById.get(preference.studentId)?.displayName ??
                                "Student",
                            )
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => lockWindow(window.id)}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 disabled:opacity-50"
                    >
                      Lock this time
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-800">{message}</p> : null}
    </section>
  );
}
