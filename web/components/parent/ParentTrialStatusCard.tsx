"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParentI18n } from "@/components/parent/ParentI18nProvider";
import { TrialTimeDisplay } from "@/components/parent/TrialTimeDisplay";
import { cancelTrialBooking } from "@/lib/actions/trial-availability";
import type {
  TrialBookingRequest,
  TrialOccurrence,
} from "@/lib/class-schedule/trial-types";

type Props = {
  bookings: TrialBookingRequest[];
  occurrences: TrialOccurrence[];
};

export function ParentTrialStatusCard({ bookings, occurrences }: Props) {
  const { t } = useParentI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pending = bookings.filter((booking) => booking.status === "pending");
  const nextOccurrence = occurrences[0] ?? null;
  const confirmedBooking =
    bookings.find(
      (booking) =>
        booking.status === "confirmed" && booking.id === nextOccurrence?.bookingId,
    ) ?? null;
  const closed = bookings
    .filter((booking) => booking.status === "declined" || booking.status === "cancelled")
    .slice(0, 2);

  if (!pending.length && !nextOccurrence && !closed.length) return null;

  const cancel = (bookingId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await cancelTrialBooking(bookingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wide text-teal-900">
        {t("trial.eyebrow")}
      </p>

      {nextOccurrence ? (
        <div className="mt-2">
          <h2 className="text-lg font-black tracking-tight text-slate-950">
            {t("trial.confirmedTitle")}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            <TrialTimeDisplay {...nextOccurrence} />
          </p>
          {confirmedBooking?.classId ? (
            <p className="mt-1 text-xs font-semibold text-slate-600">
              {t("trial.classroomReady")}
            </p>
          ) : null}
          {confirmedBooking ? (
            <Link
              href={`/parent/trials/${confirmedBooking.id}`}
              className="mt-3 inline-flex text-xs font-extrabold text-teal-900 underline"
            >
              View details and student setup
            </Link>
          ) : null}
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className={nextOccurrence ? "mt-4 border-t border-teal-100 pt-3" : "mt-2"}>
          <h2 className="text-base font-black tracking-tight text-slate-950">
            {t(pending.length > 1 ? "trial.pendingTitlePlural" : "trial.pendingTitle")}
          </h2>
          <ul className="mt-2 space-y-2">
            {pending.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-700"
              >
                <span>
                  {booking.startsAt && booking.timezone && booking.durationMinutes != null
                    ? <TrialTimeDisplay
                        startsAt={booking.startsAt}
                        durationMinutes={booking.durationMinutes}
                        timezone={booking.timezone}
                        compact
                      />
                    : t("trial.awaiting")}
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/parent/trials/${booking.id}`}
                    className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1 text-xs font-extrabold text-indigo-700"
                  >
                    View / edit
                  </Link>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => cancel(booking.id)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {t("trial.cancel")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {closed.length > 0 ? (
        <div className="mt-4 border-t border-teal-100 pt-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Recent requests
          </p>
          <ul className="mt-2 space-y-2">
            {closed.map((booking) => (
              <li key={booking.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">
                  {booking.studentDisplayName} · {booking.status}
                </span>
                <Link
                  href={`/parent/trials/${booking.id}`}
                  className="text-xs font-extrabold text-indigo-700 underline"
                >
                  View details
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}
    </section>
  );
}
