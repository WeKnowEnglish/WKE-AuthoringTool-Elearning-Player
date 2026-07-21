import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { AdminStudentsClient } from "@/components/teacher/admin/AdminStudentsClient";

export const metadata = {
  title: "Students — Admin",
  robots: { index: false, follow: false },
};

export default function TeacherAdminStudentsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Students</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Search by username or display name, then set a new 4–6 digit PIN for recovery.
        </p>
      </div>

      <AdminSubnav active="students" />

      <AdminStudentsClient />
    </>
  );
}
