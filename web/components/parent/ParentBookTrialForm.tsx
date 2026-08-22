"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrialTimeDisplay } from "@/components/parent/TrialTimeDisplay";
import { requestTrialBooking } from "@/lib/actions/trial-availability";
import type { TeacherAvailabilitySlot } from "@/lib/class-schedule/trial-types";

type ChildOption = {
  studentId: string;
  displayName: string;
};

type Props = {
  teacherTitle: string | null;
  slots: TeacherAvailabilitySlot[];
  childrenOptions: ChildOption[];
  initialStudentId: string | null;
};

const AGE_BANDS = ["Under 7", "7–9", "10–12", "13–15", "16+", "Not sure"] as const;

export function ParentBookTrialForm({
  teacherTitle,
  slots,
  childrenOptions,
  initialStudentId,
}: Props) {
  const router = useRouter();
  const hasLinked = childrenOptions.length > 0;
  const [mode, setMode] = useState<"linked" | "prospect">(
    hasLinked && initialStudentId ? "linked" : hasLinked ? "linked" : "prospect",
  );
  const [studentId, setStudentId] = useState(
    initialStudentId ?? childrenOptions[0]?.studentId ?? "",
  );
  const [childName, setChildName] = useState("");
  const [ageBand, setAgeBand] = useState<string>(AGE_BANDS[2]);
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (slots.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
        This teacher has no open trial times right now. Check back soon or pick another teacher
        from the directory.
      </p>
    );
  }

  const submit = () => {
    setError(null);
    setMessage(null);
    if (!selectedSlotId) {
      setError("Choose a time.");
      return;
    }
    startTransition(async () => {
      const result = await requestTrialBooking({
        availabilitySlotId: selectedSlotId,
        studentId: mode === "linked" ? studentId : null,
        childDisplayName: mode === "prospect" ? childName : null,
        childAgeBand: mode === "prospect" ? ageBand : null,
        guardianNote: note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Request sent. The teacher will confirm or suggest another time.");
      router.refresh();
      if (mode === "linked" && studentId) {
        router.push(`/parent/students/${studentId}/stream`);
      } else {
        router.push("/parent");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h1 className="text-xl font-black tracking-tight text-slate-950">Book a trial</h1>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        {teacherTitle ? `${teacherTitle} · ` : null}
        Pick an open time. Your request stays pending until the teacher confirms. No class
        enrollment is required to request a trial.
      </p>

      {hasLinked ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("linked")}
            className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${
              mode === "linked"
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            Linked child
          </button>
          <button
            type="button"
            onClick={() => setMode("prospect")}
            className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${
              mode === "prospect"
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 text-slate-700"
            }`}
          >
            New learner
          </button>
        </div>
      ) : null}

      {mode === "linked" && hasLinked ? (
        <label className="mt-5 block text-sm font-bold text-slate-800">
          Child
          <select
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            disabled={isPending}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          >
            {childrenOptions.map((child) => (
              <option key={child.studentId} value={child.studentId}>
                {child.displayName}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="mt-5 grid gap-3">
          <label className="block text-sm font-bold text-slate-800">
            Child&apos;s name
            <input
              type="text"
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              maxLength={120}
              disabled={isPending}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
              placeholder="As you’d like the teacher to greet them"
            />
          </label>
          <label className="block text-sm font-bold text-slate-800">
            Age band
            <select
              value={ageBand}
              onChange={(event) => setAgeBand(event.target.value)}
              disabled={isPending}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
            >
              {AGE_BANDS.map((band) => (
                <option key={band} value={band}>
                  {band}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <fieldset className="mt-4">
        <legend className="text-sm font-bold text-slate-800">Available times</legend>
        <ul className="mt-2 space-y-2">
          {slots.map((slot) => (
            <li key={slot.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                <input
                  type="radio"
                  name="slot"
                  value={slot.id}
                  checked={selectedSlotId === slot.id}
                  onChange={() => setSelectedSlotId(slot.id)}
                  disabled={isPending}
                  className="mt-1"
                />
                <span className="text-sm font-semibold text-slate-800">
                  <TrialTimeDisplay {...slot} />
                  {slot.note ? (
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                      {slot.note}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <label className="mt-4 block text-sm font-bold text-slate-800">
        Help the teacher prepare (optional)
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={400}
          rows={3}
          disabled={isPending}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
          placeholder="Interests, English experience, goals, or anything that helps your child feel comfortable"
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Request this time"}
      </button>

      {error ? <p className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm font-bold text-emerald-700">{message}</p> : null}
    </section>
  );
}
