import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { DiagnosticsAdminPanel } from "@/components/teacher/admin/DiagnosticsAdminPanel";
import { PLATFORM_HEALTH_WINDOWS } from "@/lib/app-diagnostics/platform-health";
import { getPlatformHealth } from "@/lib/data/admin-diagnostics";

export const metadata = {
  title: "Platform Health — Admin",
  robots: { index: false, follow: false },
};

function resolveWindowHours(value: string | string[] | undefined) {
  const candidate = Number(Array.isArray(value) ? value[0] : value);
  return PLATFORM_HEALTH_WINDOWS.includes(candidate as 6 | 24 | 168) ? candidate : 24;
}

export default async function TeacherAdminDiagnosticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const windowHours = resolveWindowHours(params.hours);
  const central = await getPlatformHealth(windowHours);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Platform health</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Privacy-safe learning-journey health and grouped operational issues. These signals help
          restore learning time; they never replace homework, attendance, assessment, or mastery records.
        </p>
      </div>

      <AdminSubnav active="diagnostics" />

      <DiagnosticsAdminPanel
        centralEvents={central.events}
        centralError={central.error}
        health={central.health}
      />
    </>
  );
}
