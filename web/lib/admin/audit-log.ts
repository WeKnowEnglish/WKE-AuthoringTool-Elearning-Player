import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type AuditScalar = string | number | boolean | null;

export type AdminAuditEvent = {
  actorUserId: string;
  action: string;
  targetType: "teacher_access_request" | "teacher" | "student";
  targetId?: string | null;
  targetEmail?: string | null;
  metadata?: Record<string, AuditScalar>;
};

/**
 * Record an allowlisted admin event without ever including credentials or
 * invitation URLs. This is best-effort during the migration rollout so older
 * databases do not break administrator workflows.
 */
export async function recordAdminAuditEvent(
  service: SupabaseClient,
  event: AdminAuditEvent,
): Promise<void> {
  const { error } = await service.from("admin_audit_log").insert({
    actor_user_id: event.actorUserId,
    action: event.action,
    target_type: event.targetType,
    target_id: event.targetId ?? null,
    target_email: event.targetEmail?.trim().toLowerCase() || null,
    metadata: event.metadata ?? {},
  });

  if (error) {
    console.error("[admin-audit] Could not record administrator action", {
      action: event.action,
      code: error.code,
      message: error.message,
    });
  }
}
