import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck, UsersRound } from "lucide-react";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";

export default async function ParentHomePage() {
  const students = await listParentLinkedStudents();
  if (students[0]) redirect(`/parent/students/${students[0].studentId}/stream`);

  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <UsersRound className="mx-auto h-10 w-10 text-indigo-500" aria-hidden />
      <h1 className="mt-5 text-2xl font-black tracking-tight">No child linked yet</h1>
      <p className="mt-3 leading-relaxed text-slate-600">
        Ask your child&apos;s teacher to invite this account&apos;s verified email address. Open the
        invitation email and accept it while signed in here.
      </p>
      <div className="mt-6 rounded-2xl bg-indigo-50 p-4 text-left text-sm text-indigo-950">
        <p className="flex items-center gap-2 font-extrabold">
          <MailCheck className="h-5 w-5" aria-hidden />
          Already received an invitation?
        </p>
        <p className="mt-2 leading-relaxed">
          Return to that email and use its private invitation link. Invitations work only with the
          exact verified email address the teacher entered.
        </p>
      </div>
      <Link
        href="/parent/manage-children"
        className="mt-6 inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
      >
        View linked children
      </Link>
    </section>
  );
}
