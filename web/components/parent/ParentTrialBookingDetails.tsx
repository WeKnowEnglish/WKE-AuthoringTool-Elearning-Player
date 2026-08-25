"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrialTimeDisplay } from "@/components/parent/TrialTimeDisplay";
import {
  cancelTrialBooking,
  setTrialStudentPin,
  updatePendingTrialBooking,
} from "@/lib/actions/trial-availability";
import type {
  TeacherAvailabilitySlot,
  TrialBookingRequest,
} from "@/lib/class-schedule/trial-types";

const AGE_BANDS = ["Under 7", "7–9", "10–12", "13–15", "16+", "Not sure"];

type Props = {
  booking: TrialBookingRequest;
  openSlots: TeacherAvailabilitySlot[];
  studentUsername: string | null;
};

export function ParentTrialBookingDetails({ booking, openSlots, studentUsername }: Props) {
  const router = useRouter();
  const [slotId, setSlotId] = useState(booking.availabilitySlotId);
  const [childName, setChildName] = useState(booking.studentDisplayName);
  const [ageBand, setAgeBand] = useState(booking.childAgeBand ?? "Not sure");
  const [note, setNote] = useState(booking.guardianNote ?? "");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isProspect = !booking.studentId || booking.studentCreatedForTrial;

  const slots = useMemo(() => {
    const rows = [...openSlots];
    if (
      booking.startsAt &&
      booking.durationMinutes != null &&
      booking.timezone &&
      !rows.some((slot) => slot.id === booking.availabilitySlotId)
    ) {
      rows.unshift({
        id: booking.availabilitySlotId,
        teacherId: booking.teacherId,
        startsAt: booking.startsAt,
        durationMinutes: booking.durationMinutes,
        timezone: booking.timezone,
        status: booking.status === "pending" ? "held" : "booked",
        note: null,
        seriesId: null,
        seriesSequence: null,
      });
    }
    return rows;
  }, [booking, openSlots]);

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updatePendingTrialBooking({
        bookingId: booking.id,
        availabilitySlotId: slotId,
        childDisplayName: isProspect ? childName : null,
        childAgeBand: isProspect ? ageBand : null,
        guardianNote: note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Booking details updated.");
      router.refresh();
    });
  };

  const cancel = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await cancelTrialBooking(booking.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/parent");
      router.refresh();
    });
  };

  const setStudentCode = () => {
    setError(null);
    setMessage(null);
    if (pin !== confirmPin) {
      setError("The secret codes do not match.");
      return;
    }
    startTransition(async () => {
      const result = await setTrialStudentPin({ bookingId: booking.id, pin });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPin("");
      setConfirmPin("");
      setMessage("Student secret code saved. Test the student login before class.");
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
          Trial booking
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          {booking.studentDisplayName}
        </h1>
        <p className="mt-2 text-sm font-semibold capitalize text-slate-600">
          Status: {booking.status}
        </p>
      </header>

      {booking.startsAt && booking.durationMinutes != null && booking.timezone ? (
        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-teal-900">
            Current time
          </p>
          <div className="mt-2">
            <TrialTimeDisplay
              startsAt={booking.startsAt}
              durationMinutes={booking.durationMinutes}
              timezone={booking.timezone}
            />
          </div>
        </section>
      ) : null}

      {booking.status === "pending" ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Edit request</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Changes are available until the teacher confirms the trial.
          </p>

          {isProspect ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-800">
                Child&apos;s name
                <input
                  value={childName}
                  onChange={(event) => setChildName(event.target.value)}
                  maxLength={120}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                />
              </label>
              <label className="text-sm font-bold text-slate-800">
                Age band
                <select
                  value={ageBand}
                  onChange={(event) => setAgeBand(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
                >
                  {AGE_BANDS.map((band) => <option key={band}>{band}</option>)}
                </select>
              </label>
            </div>
          ) : null}

          <fieldset className="mt-4">
            <legend className="text-sm font-bold text-slate-800">Trial time</legend>
            <ul className="mt-2 space-y-2">
              {slots.map((slot) => (
                <li key={slot.id}>
                  <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                    <input
                      type="radio"
                      name="trial-slot"
                      checked={slotId === slot.id}
                      onChange={() => setSlotId(slot.id)}
                      className="mt-1"
                    />
                    <TrialTimeDisplay {...slot} compact />
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <label className="mt-4 block text-sm font-bold text-slate-800">
            Help the teacher prepare
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={400}
              rows={4}
              placeholder="Interests, English experience, goals, or support needs"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={isPending}
              className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-extrabold text-rose-700 disabled:opacity-60"
            >
              Cancel request
            </button>
          </div>
        </section>
      ) : null}

      {booking.status === "confirmed" && booking.studentCreatedForTrial && studentUsername ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <h2 className="text-lg font-black text-slate-950">Set up the student login</h2>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            Username: <span className="font-black">{studentUsername}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Choose a six-digit code together, then test it before the trial.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-800">
              Six-digit secret code
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 font-semibold"
              />
            </label>
            <label className="text-sm font-bold text-slate-800">
              Confirm secret code
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 font-semibold"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={setStudentCode}
              disabled={isPending || pin.length !== 6 || confirmPin.length !== 6}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
            >
              Save student code
            </button>
            <Link
              href="/login"
              className="rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-extrabold text-indigo-800"
            >
              Test student login
            </Link>
          </div>
        </section>
      ) : null}

      {booking.teacherNote ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-black text-slate-900">Teacher note</h2>
          <p className="mt-2 text-sm text-slate-700">{booking.teacherNote}</p>
        </section>
      ) : null}

      {booking.status === "confirmed" ? (
        <p className="text-sm font-semibold text-slate-600">
          Need to change a confirmed time? Contact the teacher so the class is not moved without
          their knowledge.
        </p>
      ) : null}

      {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm font-bold text-emerald-700">{message}</p> : null}

      <Link href="/parent" className="inline-flex text-sm font-extrabold text-indigo-700 underline">
        Back to parent home
      </Link>
    </div>
  );
}
