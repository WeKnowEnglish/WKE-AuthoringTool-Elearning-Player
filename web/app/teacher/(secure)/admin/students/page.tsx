import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { AdminStudentsClient } from "@/components/teacher/admin/AdminStudentsClient";
import { listStudentsForAdmin } from "@/lib/actions/admin-users";

export const metadata = {
  title: "Students — Admin",
  robots: { index: false, follow: false },
};

export default async function TeacherAdminStudentsPage() {
  const listed = await listStudentsForAdmin();

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Students</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Browse every student account, filter by name, and set a new 4–6 digit PIN for recovery.
        </p>
      </div>

      <AdminSubnav active="students" />

      {listed.ok ? (
        <AdminStudentsClient students={listed.students} />
      ) : (
        <p className="text-sm text-red-600" role="alert">
          {listed.error}
        </p>
      )}
    </>
  );
}
