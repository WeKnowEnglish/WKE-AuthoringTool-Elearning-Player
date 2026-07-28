import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { DiagnosticsAdminPanel } from "@/components/teacher/admin/DiagnosticsAdminPanel";

export const metadata = {
  title: "Diagnostics — Admin",
  robots: { index: false, follow: false },
};

export default function TeacherAdminDiagnosticsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Session diagnostics</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Load-time and interaction timing for the current browser tab. Browse the site, then export
          JSON or CSV to investigate friction points.
        </p>
      </div>

      <AdminSubnav active="diagnostics" />

      <DiagnosticsAdminPanel />
    </>
  );
}
