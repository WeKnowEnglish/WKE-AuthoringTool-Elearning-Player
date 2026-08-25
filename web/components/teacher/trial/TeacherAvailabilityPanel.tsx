"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelTeacherAvailabilitySlot,
  createTeacherAvailabilitySeries,
  setTeacherTrialsEnabled,
  updateTeacherAvailabilitySlot,
} from "@/lib/actions/trial-availability";
import { formatTrialSlotLabel } from "@/lib/class-schedule/trial-format";
import type { TeacherAvailabilitySlot } from "@/lib/class-schedule/trial-types";
import {
  classScheduleTimezoneOptions,
  detectBrowserTimeZone,
} from "@/lib/class-schedule/timezone";
import { DEFAULT_CLASS_MEETING_TIMEZONE } from "@/lib/class-schedule/types";

type Props = {
  initialSlots: TeacherAvailabilitySlot[];
  bookingLink: string;
  publicBookPath: string | null;
  trialsEnabled: boolean;
  spacePublished: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function defaultDateAndTime(): { date: string; time: string } {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  value.setMinutes(0, 0, 0);
  if (value.getHours() < 9) value.setHours(16);
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}

function wallParts(startsAt: string, timezone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(startsAt));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

export function TeacherAvailabilityPanel({
  initialSlots,
  bookingLink,
  publicBookPath,
  trialsEnabled: initialTrialsEnabled,
  spacePublished,
}: Props) {
  const router = useRouter();
  const defaults = useMemo(defaultDateAndTime, []);
  const [slots, setSlots] = useState(initialSlots);
  const [startDate, setStartDate] = useState(defaults.date);
  const [startTime, setStartTime] = useState(defaults.time);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [timezone, setTimezone] = useState(DEFAULT_CLASS_MEETING_TIMEZONE);
  const [detectedZone, setDetectedZone] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [trialsEnabled, setTrialsEnabled] = useState(initialTrialsEnabled);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setSlots(initialSlots), [initialSlots]);
  useEffect(() => {
    const detected = detectBrowserTimeZone();
    setDetectedZone(detected);
    if (detected) setTimezone(detected);
  }, []);

  const timezoneOptions = useMemo(
    () => classScheduleTimezoneOptions(detectedZone),
    [detectedZone],
  );

  const resetForm = () => {
    const next = defaultDateAndTime();
    setStartDate(next.date);
    setStartTime(next.time);
    setRepeatWeeks(1);
    setDurationMinutes(45);
    setNote("");
    setEditingSlotId(null);
  };

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = editingSlotId
        ? await updateTeacherAvailabilitySlot({
            slotId: editingSlotId,
            startsAtWall: `${startDate}T${startTime}`,
            durationMinutes,
            timezone,
            note,
          })
        : await createTeacherAvailabilitySeries({
            startDate,
            startTime,
            repeatWeeks,
            durationMinutes,
            timezone,
            note,
          });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        editingSlotId
          ? "Trial time updated."
          : repeatWeeks > 1
            ? `${repeatWeeks} weekly trial times published.`
            : "Open trial time published.",
      );
      resetForm();
      router.refresh();
    });
  };

  const beginEdit = (slot: TeacherAvailabilitySlot) => {
    const wall = wallParts(slot.startsAt, slot.timezone);
    setStartDate(wall.date);
    setStartTime(wall.time);
    setDurationMinutes(slot.durationMinutes);
    setTimezone(slot.timezone);
    setNote(slot.note ?? "");
    setRepeatWeeks(1);
    setEditingSlotId(slot.id);
    setError(null);
    setMessage("Editing one occurrence. Other recurring times will not move.");
  };

  const cancel = (slotId: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await cancelTeacherAvailabilitySlot(slotId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSlots((current) => current.filter((slot) => slot.id !== slotId));
      if (editingSlotId === slotId) resetForm();
      setMessage("Trial time cancelled.");
      router.refresh();
    });
  };

  const toggleTrials = (enabled: boolean) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setTeacherTrialsEnabled(enabled);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTrialsEnabled(enabled);
      setMessage(
        enabled
          ? "Parents can find you in the teacher directory and on your Classroom Wall."
          : "Trial discovery turned off.",
      );
      router.refresh();
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link. Select and copy it manually.");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black tracking-tight text-slate-950">
        Publish trial times
      </h2>
      <p className="mt-1 text-sm font-semibold text-slate-600">
        Publish one time or repeat it weekly. Past unbooked times disappear automatically;
        completed and booked trials remain in history.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={trialsEnabled}
            disabled={isPending || (!spacePublished && !trialsEnabled)}
            onChange={(event) => toggleTrials(event.target.checked)}
          />
          <span>
            List me for parent trial booking
            <span className="mt-0.5 block text-xs font-semibold text-slate-500">
              Requires a published Classroom Wall and Teacher Plus for live hosting.
              {!spacePublished ? " Publish your space first." : null}
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
        <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-800">
          Parent booking link
        </p>
        <p className="mt-1 break-all text-sm font-semibold text-slate-800">{bookingLink}</p>
        {publicBookPath ? (
          <p className="mt-1 text-xs font-semibold text-slate-600">Public path: {publicBookPath}</p>
        ) : null}
        <button
          type="button"
          onClick={() => void copyLink()}
          className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-indigo-700"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold text-slate-800">
          Date
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          />
        </label>
        <label className="block text-sm font-bold text-slate-800">
          Start time
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          />
        </label>
        {!editingSlotId ? (
          <label className="block text-sm font-bold text-slate-800">
            Repeat
            <select
              value={repeatWeeks}
              onChange={(event) => setRepeatWeeks(Number(event.target.value))}
              disabled={isPending}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
            >
              <option value={1}>One time</option>
              <option value={4}>Weekly · 4 weeks</option>
              <option value={8}>Weekly · 8 weeks</option>
              <option value={12}>Weekly · 12 weeks</option>
              <option value={16}>Weekly · 16 weeks</option>
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-bold text-slate-800">
          Duration
          <select
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          >
            {[30, 45, 60, 75, 90].map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} minutes</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-800 sm:col-span-2">
          Timezone
          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          >
            {timezoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-800 sm:col-span-2">
          Note (optional)
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={280}
            disabled={isPending}
            placeholder="e.g. Placement and conversation trial"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? "Saving…" : editingSlotId ? "Save changes" : "Publish availability"}
        </button>
        {editingSlotId ? (
          <button
            type="button"
            onClick={resetForm}
            disabled={isPending}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-extrabold text-slate-700"
          >
            Stop editing
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-bold text-emerald-700">{message}</p> : null}

      <ul className="mt-6 space-y-2">
        {slots.length === 0 ? (
          <li className="text-sm font-semibold text-slate-500">No upcoming times.</li>
        ) : (
          slots.map((slot) => (
            <li
              key={slot.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  {formatTrialSlotLabel(slot)}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {slot.status}
                  {slot.seriesId ? " · recurring" : ""}
                  {slot.note ? ` · ${slot.note}` : ""}
                </p>
              </div>
              {slot.status === "open" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => beginEdit(slot)}
                    disabled={isPending}
                    className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-extrabold text-indigo-700 disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => cancel(slot.id)}
                    disabled={isPending}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-extrabold text-slate-700 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
