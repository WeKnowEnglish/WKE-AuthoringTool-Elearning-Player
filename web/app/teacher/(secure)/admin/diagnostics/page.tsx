import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { DiagnosticsAdminPanel } from "@/components/teacher/admin/DiagnosticsAdminPanel";
import { listRecentCentralDiagnostics } from "@/lib/data/admin-diagnostics";

export const metadata = {
  title: "Diagnostics — Admin",
  robots: { index: false, follow: false },
};

export default async function TeacherAdminDiagnosticsPage() {
  const central = await listRecentCentralDiagnostics(24);
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Session diagnostics</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Cross-device activity, performance, and error timelines from the last 24 hours, with
          local browser exports retained for deeper troubleshooting.
        </p>
      </div>

      <AdminSubnav active="diagnostics" />

      <DiagnosticsAdminPanel centralEvents={central.events} centralError={central.error} />
    </>
  );
}
