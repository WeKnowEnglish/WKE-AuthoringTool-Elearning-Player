import "server-only";

import { requireAdminContext } from "@/lib/admin/admin-context";

export type AdminEmailSendSummary = {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  status: "pending" | "sent" | "failed";
  failureReason: string | null;
  providerMessageId: string | null;
  createdAt: string;
  sentAt: string | null;
};

export async function listAdminEmailSends(limit = 50): Promise<
  | { ok: true; sends: AdminEmailSendSummary[] }
  | { ok: false; error: string; sends: [] }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return { ...gate, sends: [] };

  const { data, error } = await gate.ctx.service
    .from("admin_email_sends")
    .select(
      "id, recipient_email, recipient_name, subject, status, failure_reason, provider_message_id, created_at, sent_at",
    )
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (error) return { ok: false, error: error.message, sends: [] };
  return {
    ok: true,
    sends: (data ?? []).map((row) => ({
      id: String(row.id),
      recipientEmail: String(row.recipient_email),
      recipientName: row.recipient_name ? String(row.recipient_name) : null,
      subject: String(row.subject),
      status: row.status as AdminEmailSendSummary["status"],
      failureReason: row.failure_reason ? String(row.failure_reason) : null,
      providerMessageId: row.provider_message_id ? String(row.provider_message_id) : null,
      createdAt: String(row.created_at),
      sentAt: row.sent_at ? String(row.sent_at) : null,
    })),
  };
}
