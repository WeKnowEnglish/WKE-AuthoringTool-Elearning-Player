"use client";

import { useState, useTransition } from "react";
import { saveClassMeetingSlots } from "@/lib/actions/class-meeting-slots";
import {
  CLASS_MEETING_WEEKDAYS,
  CLASS_MEETING_WEEKDAY_LABELS,
  DEFAULT_CLASS_MEETING_TIMEZONE,
  type ClassMeetingSlot,
  type ClassMeetingWeekday,
} from "@/lib/class-schedule/types";
import { formatWeeklySlotLabel } from "@/lib/class-schedule/next-meeting";

const TIMEZONE_OPTIONS = [
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
] as const;

type DraftSlot = {
  weekday: ClassMeetingWeekday;
  startTime: string;
  durationMinutes: number;
};

type Props = {
  classId: string;
  archived: boolean;
  initialSlots: ClassMeetingSlot[];
};

function slotsToDraft(slots: ClassMeetingSlot[]): DraftSlot[] {
  return slots.map((slot) => ({
    weekday: slot.weekday,
    startTime: slot.startTime,
    durationMinutes: slot.durationMinutes,
  }));
}

function emptyDraft(): DraftSlot {
  return { weekday: 1, startTime: "16:00", durationMinutes: 60 };
}

export function ClassMeetingSchedulePanel({ classId, archived, initialSlots }: Props) {
  const [slots, setSlots] = useState(initialSlots);
  const [timezone, setTimezone] = useState(
    initialSlots[0]?.timezone ?? DEFAULT_CLASS_MEETING_TIMEZONE,
  );
  const [draft, setDraft] = useState<DraftSlot>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const disabled = archived || isPending;

  const persist = (nextDrafts: DraftSlot[]) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveClassMeetingSlots({
        classId,
        timezone,
        slots: nextDrafts,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSlots(result.slots);
      setMessage("Schedule saved.");
    });
  };

  const addSlot = () => {
    const next = [...slotsToDraft(slots), draft];
    persist(next);
  };

  const removeSlot = (index: number) => {
    const next = slotsToDraft(slots).filter((_, i) => i !== index);
    persist(next);
  };

  const saveTimezone = (value: string) => {
    setTimezone(value);
    if (slots.length === 0) return;
    persist(slotsToDraft(slots));
  };

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Weekly schedule
      </p>
      <h2 className="mt-1 text-lg font-bold text-neutral-900">Class meeting times</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Students see the weekly pattern and the next lesson on their Classroom page.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-neutral-800">
          Timezone
          <select
            value={timezone}
            disabled={disabled}
            onChange={(event) => saveTimezone(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
          >
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {slots.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {slots.map((slot, index) => (
            <li
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2"
            >
              <span className="text-sm font-semibold text-neutral-900">
                {formatWeeklySlotLabel(slot)}
                <span className="ml-2 text-xs font-medium text-neutral-500">
                  ({slot.durationMinutes} min)
                </span>
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeSlot(index)}
                className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
          No weekly meeting times yet.
        </p>
      )}

      {!archived ? (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-sm font-semibold text-neutral-900">Add a weekly slot</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-neutral-700">
              Day
              <select
                value={draft.weekday}
                disabled={disabled || slots.length >= 7}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    weekday: Number(event.target.value) as ClassMeetingWeekday,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
              >
                {(CLASS_MEETING_WEEKDAYS as readonly ClassMeetingWeekday[]).map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {CLASS_MEETING_WEEKDAY_LABELS[weekday]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-neutral-700">
              Start time
              <input
                type="time"
                value={draft.startTime}
                disabled={disabled || slots.length >= 7}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, startTime: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-neutral-700">
              Duration (min)
              <input
                type="number"
                min={15}
                max={240}
                step={15}
                value={draft.durationMinutes}
                disabled={disabled || slots.length >= 7}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    durationMinutes: Number(event.target.value),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={disabled || slots.length >= 7}
            onClick={addSlot}
            className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Add slot"}
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
    </section>
  );
}
