import { AdminGuardianSupportPanel } from "@/components/teacher/admin/AdminGuardianSupportPanel";
import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { listAdminGuardianSupport } from "@/lib/data/admin-guardians";

export const metadata = {
  title: "Guardian support - Admin",
  robots: { index: false, follow: false },
};

export default async function AdminGuardiansPage() {
  const result = await listAdminGuardianSupport();
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Guardian support</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Investigate invitations and family connections, revoke unsafe access, and inspect a
          privacy-limited lifecycle audit trail.
        </p>
      </div>
      <AdminSubnav active="guardians" />
      {result.ok ? (
        <AdminGuardianSupportPanel data={result.data} />
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {result.error}
        </div>
      )}
    </>
  );
}
