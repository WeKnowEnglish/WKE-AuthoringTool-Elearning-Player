import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, MailCheck, UsersRound } from "lucide-react";
import { ParentTrialStatusCard } from "@/components/parent/ParentTrialStatusCard";
import {
  listParentOwnTrialBookings,
  listParentOwnUpcomingTrialOccurrences,
} from "@/lib/data/trial-availability";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";

export default async function ParentHomePage() {
  const students = await listParentLinkedStudents();
  if (students[0]) redirect(`/parent/students/${students[0].studentId}/stream`);

  const [bookings, occurrences] = await Promise.all([
    listParentOwnTrialBookings(),
    listParentOwnUpcomingTrialOccurrences(),
  ]);

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <ParentTrialStatusCard bookings={bookings} occurrences={occurrences} />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <UsersRound className="mx-auto h-10 w-10 text-indigo-500" aria-hidden />
        <h1 className="mt-5 text-2xl font-black tracking-tight">Welcome, parents</h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          You can book a trial before your child has a student account. If a teacher already invited
          you, use that email invitation to link an enrolled child.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/parents/teachers"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            Find a teacher & book a trial
          </Link>
          <Link
            href="/parents"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          >
            How it works
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-5 text-left text-sm text-indigo-950">
        <p className="flex items-center gap-2 font-extrabold">
          <MailCheck className="h-5 w-5" aria-hidden />
          Already received a class invitation?
        </p>
        <p className="mt-2 leading-relaxed">
          Return to that email and use its private invitation link with this verified address.
        </p>
        <Link
          href="/parent/manage-children"
          className="mt-4 inline-flex font-extrabold text-indigo-800 underline"
        >
          View linked children
        </Link>
      </div>
    </section>
  );
}
