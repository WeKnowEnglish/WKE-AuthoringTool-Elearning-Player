import Link from "next/link";
import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { countPendingAccessRequests } from "@/lib/data/admin-users";
import { listAdminTeachers } from "@/lib/actions/admin-users";

export const metadata = {
  title: "Admin — Teacher",
  robots: { index: false, follow: false },
};

export default async function TeacherAdminHubPage() {
  const [pendingCount, teachersResult] = await Promise.all([
    countPendingAccessRequests(),
    listAdminTeachers(),
  ]);
  const teacherCount = teachersResult.ok ? teachersResult.teachers.length : null;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Admin</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Manage teacher access requests, teacher tiers, and student PIN recovery.
        </p>
      </div>

      <AdminSubnav active="hub" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/teacher/admin/requests"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-400"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Pending requests
          </p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{pendingCount}</p>
        </Link>
        <Link
          href="/teacher/admin/teachers"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-400"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Teachers
          </p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">
            {teacherCount ?? "—"}
          </p>
        </Link>
        <Link
          href="/teacher/admin/students"
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-400"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Students
          </p>
          <p className="mt-2 text-lg font-bold text-neutral-900">Search &amp; recover</p>
        </Link>
      </div>

      <p className="text-sm text-neutral-600">
        Curriculum tools stay at{" "}
        <Link href="/teacher/dictionary/review" className="font-semibold underline">
          Lexicon review
        </Link>
        .
      </p>
    </>
  );
}
