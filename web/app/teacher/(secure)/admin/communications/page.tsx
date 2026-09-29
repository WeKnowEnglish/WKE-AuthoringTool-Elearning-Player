import { AdminCommunicationsClient } from "@/components/teacher/admin/AdminCommunicationsClient";
import { AdminSubnav } from "@/components/teacher/admin/AdminSubnav";
import { listAdminTeachers } from "@/lib/actions/admin-users";
import { listAdminEmailSends } from "@/lib/data/admin-communications";

export const metadata = {
  title: "Communications — Admin",
  robots: { index: false, follow: false },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export default async function AdminCommunicationsPage() {
  const [teachersResult, sendsResult] = await Promise.all([
    listAdminTeachers(),
    listAdminEmailSends(),
  ]);
  const teachers = teachersResult.ok ? teachersResult.teachers : [];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Communications</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Contact prospective and current teachers from the portal. Each attempt is recorded before
          it is sent through the configured Resend account.
        </p>
      </div>

      <AdminSubnav active="communications" />

      <AdminCommunicationsClient teachers={teachers} />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Recent sends</h2>
          <p className="text-sm text-neutral-600">The newest 50 email attempts are shown here.</p>
        </div>
        {!sendsResult.ok ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="alert">
            Email history is unavailable: {sendsResult.error}. Apply migration 153 before using this page.
          </p>
        ) : sendsResult.sends.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-5 text-sm text-neutral-600">
            No emails have been sent from this communications page yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Recipient</th>
                  <th className="px-3 py-2 font-semibold">Subject</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {sendsResult.sends.map((send) => (
                  <tr key={send.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-neutral-900">{send.recipientName || send.recipientEmail}</p>
                      {send.recipientName ? <p className="text-xs text-neutral-500">{send.recipientEmail}</p> : null}
                    </td>
                    <td className="max-w-sm px-3 py-2 text-neutral-700">{send.subject}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold capitalize">{send.status}</span>
                      {send.failureReason ? <p className="max-w-sm text-xs text-red-700">{send.failureReason}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-500">{formatDate(send.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
