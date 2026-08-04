"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelTeacherAvailabilitySlot,
  createTeacherAvailabilitySlot,
  setTeacherTrialsEnabled,
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

function defaultWallStart(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  if (date.getHours() < 9) date.setHours(16);
  const pad = (n: number) => String(n).padStart(2, "0");
  // Wall clock for the form (interpreted in selected timezone on save)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TeacherAvailabilityPanel({
  initialSlots,
  bookingLink,
  publicBookPath,
  trialsEnabled: initialTrialsEnabled,
  spacePublished,
}: Props) {
  const router = useRouter();
  const [slots, setSlots] = useState(initialSlots);
  const [startsWall, setStartsWall] = useState(defaultWallStart);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [timezone, setTimezone] = useState(DEFAULT_CLASS_MEETING_TIMEZONE);
  const [detectedZone, setDetectedZone] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [trialsEnabled, setTrialsEnabled] = useState(initialTrialsEnabled);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const detected = detectBrowserTimeZone();
    setDetectedZone(detected);
    if (detected) setTimezone(detected);
  }, []);

  const timezoneOptions = useMemo(
    () => classScheduleTimezoneOptions(detectedZone),
    [detectedZone],
  );

  const publish = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createTeacherAvailabilitySlot({
        startsAtWall: startsWall,
        durationMinutes,
        timezone,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Open slot published.");
      setNote("");
      setStartsWall(defaultWallStart());
      router.refresh();
    });
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
      setMessage("Slot cancelled.");
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
          ? "Parents can find you on /parents/teachers and your Classroom Wall."
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
        Enter the start in the timezone you choose below. Parents request a slot; you confirm in
        the inbox.
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
              Requires a published Classroom Wall. Light and Plus teachers can accept trials.
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
          <p className="mt-1 text-xs font-semibold text-slate-600">
            Public path: {publicBookPath}
          </p>
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
          Start (in selected timezone)
          <input
            type="datetime-local"
            value={startsWall}
            onChange={(event) => setStartsWall(event.target.value)}
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          />
        </label>
        <label className="block text-sm font-bold text-slate-800">
          Duration (minutes)
          <input
            type="number"
            min={15}
            max={240}
            step={15}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value) || 45)}
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          />
        </label>
        <label className="block text-sm font-bold text-slate-800 sm:col-span-2">
          Timezone
          <select
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          >
            {timezoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
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
            placeholder="e.g. Placement chat · Zoom"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={publish}
        disabled={isPending}
        className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Publish open slot"}
      </button>

      {error ? <p className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-bold text-emerald-700">{message}</p> : null}

      <ul className="mt-6 space-y-2">
        {slots.length === 0 ? (
          <li className="text-sm font-semibold text-slate-500">No published slots yet.</li>
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
                  {slot.note ? ` · ${slot.note}` : ""}
                </p>
              </div>
              {slot.status === "open" ? (
                <button
                  type="button"
                  onClick={() => cancel(slot.id)}
                  disabled={isPending}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-extrabold text-slate-700 hover:bg-white disabled:opacity-60"
                >
                  Cancel
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
