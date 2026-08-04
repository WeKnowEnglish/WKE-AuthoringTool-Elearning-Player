"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  confirmTrialBooking,
  declineTrialBooking,
} from "@/lib/actions/trial-availability";
import { formatTrialSlotLabel } from "@/lib/class-schedule/trial-format";
import type { TrialBookingRequest } from "@/lib/class-schedule/trial-types";

type Props = {
  initialBookings: TrialBookingRequest[];
};

type CredentialNotice = {
  bookingId: string;
  childName: string;
  username: string;
  pin: string;
  classId: string | null;
};

export function TeacherTrialInbox({ initialBookings }: Props) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CredentialNotice | null>(null);
  const [isPending, startTransition] = useTransition();

  const pending = bookings.filter((booking) => booking.status === "pending");
  const recent = bookings.filter((booking) => booking.status !== "pending").slice(0, 8);

  const confirm = (booking: TrialBookingRequest) => {
    setError(null);
    setCredentials(null);
    startTransition(async () => {
      const result = await confirmTrialBooking({ bookingId: booking.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBookings((current) =>
        current.map((row) =>
          row.id === booking.id
            ? {
                ...row,
                status: "confirmed" as const,
                classId: result.classId,
                occurrenceId: result.occurrenceId,
                studentId: result.studentId,
              }
            : row,
        ),
      );
      if (result.createdCredentials) {
        setCredentials({
          bookingId: booking.id,
          childName: booking.studentDisplayName,
          username: result.createdCredentials.username,
          pin: result.createdCredentials.pin,
          classId: result.classId,
        });
      }
      router.refresh();
    });
  };

  const decline = (bookingId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await declineTrialBooking({ bookingId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? { ...booking, status: "declined" as const } : booking,
        ),
      );
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black tracking-tight text-slate-950">Trial requests</h2>
      <p className="mt-1 text-sm font-semibold text-slate-600">
        Confirm creates a trial class and enrolls the learner. For new (prospect) bookings, a
        student login is created and the parent is linked automatically.
      </p>

      {error ? <p className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}

      {credentials ? (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950">
          <p className="font-extrabold">Student account created for {credentials.childName}</p>
          <p className="mt-2 font-semibold">
            Username: <span className="font-black">{credentials.username}</span>
          </p>
          <p className="font-semibold">
            Secret code: <span className="font-black">{credentials.pin}</span>
          </p>
          <p className="mt-2 text-xs font-semibold text-emerald-900/80">
            Share these once with the family. They can change the code later from the student
            profile tools if you enable that.
          </p>
          {credentials.classId ? (
            <Link
              href={`/teacher/classes/${credentials.classId}`}
              className="mt-3 inline-flex text-xs font-extrabold text-emerald-900 underline"
            >
              Open trial class
            </Link>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-4 space-y-3">
        {pending.length === 0 ? (
          <li className="text-sm font-semibold text-slate-500">No pending requests.</li>
        ) : (
          pending.map((booking) => {
            const isProspect = !booking.studentId;
            return (
              <li
                key={booking.id}
                className="rounded-xl border border-amber-200 bg-amber-50/70 p-3"
              >
                <p className="text-sm font-extrabold text-slate-950">
                  {booking.studentDisplayName}
                  <span className="ml-2 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                    {isProspect ? "New learner" : "Linked child"}
                  </span>
                </p>
                {booking.childAgeBand ? (
                  <p className="mt-0.5 text-xs font-semibold text-slate-600">
                    Age band: {booking.childAgeBand}
                  </p>
                ) : null}
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {booking.startsAt && booking.timezone && booking.durationMinutes != null
                    ? formatTrialSlotLabel({
                        startsAt: booking.startsAt,
                        durationMinutes: booking.durationMinutes,
                        timezone: booking.timezone,
                      })
                    : "Time unavailable"}
                </p>
                {booking.guardianNote ? (
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    Note: {booking.guardianNote}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => confirm(booking)}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => decline(booking.id)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Decline
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {recent.length > 0 ? (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Recent
          </p>
          <ul className="mt-2 space-y-2">
            {recent.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-700"
              >
                <span>
                  {booking.studentDisplayName} · {booking.status}
                </span>
                {booking.classId ? (
                  <Link
                    href={`/teacher/classes/${booking.classId}`}
                    className="text-xs font-extrabold text-indigo-700 hover:underline"
                  >
                    Open class
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
