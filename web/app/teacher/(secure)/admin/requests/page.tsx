import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { AdminRequestsClient } from "@/components/teacher/admin/AdminRequestsClient";
import {
  listAdminAccessRequests,
  type AccessRequestStatus,
} from "@/lib/data/admin-users";

export const metadata = {
  title: "Access requests — Admin",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Promise<{ status?: string }>;
};

function parseStatus(raw: string | undefined): AccessRequestStatus | "all" {
  if (raw === "approved" || raw === "declined" || raw === "all" || raw === "pending") {
    return raw;
  }
  return "pending";
}

export default async function TeacherAdminRequestsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const status = parseStatus(sp.status);
  const listed = await listAdminAccessRequests({ status });

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Access requests</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Approve as Teacher Light or Plus (sends a welcome email with temp password), or decline.
          Use Resend welcome on approved rows if needed.
        </p>
      </div>

      <AdminSubnav active="requests" />

      {listed.ok ? (
        <AdminRequestsClient requests={listed.requests} initialStatus={status} />
      ) : (
        <p className="text-sm text-red-600" role="alert">
          {listed.error}
        </p>
      )}
    </>
  );
}
