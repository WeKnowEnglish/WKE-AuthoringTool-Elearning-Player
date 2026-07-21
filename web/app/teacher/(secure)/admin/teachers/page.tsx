import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { AdminTeachersClient } from "@/components/teacher/admin/AdminTeachersClient";
import { listAdminTeachers } from "@/lib/actions/admin-users";

export const metadata = {
  title: "Teachers — Admin",
  robots: { index: false, follow: false },
};

export default async function TeacherAdminTeachersPage() {
  const listed = await listAdminTeachers();

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Teachers</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Change light/plus tier, resend invitation (if they haven’t set a password yet), or reset a
          temporary password and force induction.
        </p>
      </div>

      <AdminSubnav active="teachers" />

      {listed.ok ? (
        <AdminTeachersClient teachers={listed.teachers} />
      ) : (
        <p className="text-sm text-red-600" role="alert">
          {listed.error}
        </p>
      )}
    </>
  );
}
