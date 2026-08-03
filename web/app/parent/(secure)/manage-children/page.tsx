import Link from "next/link";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";

export default async function ManageChildrenPage() {
  const students = await listParentLinkedStudents();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-indigo-600">
          Family access
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Linked children</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">
          These are the children whose teachers have approved access for this account.
        </p>
      </header>

      {students.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {students.map((student) => (
            <article key={student.studentId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
                  <UserRound className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black">{student.displayName}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {student.classTitle ?? "Active family connection"}
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-600" aria-label="Active access" />
              </div>
              <Link
                href={`/parent/students/${student.studentId}/stream`}
                className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700"
              >
                View updates
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Mail className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
          <h2 className="mt-3 text-lg font-black">No active connections</h2>
          <p className="mt-2 text-slate-600">A teacher invitation is needed to link a child.</p>
        </div>
      )}

      <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <p className="font-extrabold">Need to change or remove access?</p>
        <p className="mt-1 leading-relaxed">
          Contact the child&apos;s teacher. For student privacy, family relationships cannot be added
          or transferred from this page.
        </p>
      </aside>
    </div>
  );
}
