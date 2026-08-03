import "server-only";

import { listAuthUsersPaginated, requireAdminContext } from "@/lib/admin/admin-context";

export type AdminGuardianConnection = {
  id: string;
  studentId: string;
  studentName: string;
  guardianUserId: string;
  guardianEmail: string | null;
  relationshipType: "parent" | "guardian";
  status: "active" | "revoked";
  activatedAt: string;
  revokedAt: string | null;
};

export type AdminGuardianInvitation = {
  id: string;
  studentName: string;
  invitedEmail: string;
  status: string;
  emailStatus: string;
  expiresAt: string;
  createdAt: string;
};

export type AdminGuardianAuditEvent = {
  id: string;
  action: string;
  studentName: string | null;
  actorEmail: string | null;
  guardianEmail: string | null;
  createdAt: string;
};

export type AdminGuardianSupportData = {
  connections: AdminGuardianConnection[];
  invitations: AdminGuardianInvitation[];
  auditEvents: AdminGuardianAuditEvent[];
};

export async function listAdminGuardianSupport(): Promise<
  { ok: true; data: AdminGuardianSupportData } | { ok: false; error: string }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const [connectionResult, invitationResult, auditResult, users] = await Promise.all([
    gate.ctx.service
      .from("student_guardians")
      .select("id, student_id, guardian_user_id, relationship_type, status, activated_at, revoked_at")
      .order("updated_at", { ascending: false })
      .limit(250),
    gate.ctx.service
      .from("guardian_invitations")
      .select("id, student_id, invited_email, status, email_status, expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(250),
    gate.ctx.service
      .from("guardian_audit_log")
      .select("id, action, student_id, actor_user_id, guardian_user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    listAuthUsersPaginated(gate.ctx.service, { maxPages: 10, perPage: 200 }),
  ]);

  const firstError = connectionResult.error ?? invitationResult.error ?? auditResult.error;
  if (firstError) return { ok: false, error: firstError.message };

  const studentIds = Array.from(
    new Set([
      ...(connectionResult.data ?? []).map((row) => String(row.student_id)),
      ...(invitationResult.data ?? []).map((row) => String(row.student_id)),
      ...(auditResult.data ?? [])
        .map((row) => (row.student_id ? String(row.student_id) : ""))
        .filter(Boolean),
    ]),
  );
  const { data: profiles, error: profileError } = studentIds.length
    ? await gate.ctx.service
        .from("student_profiles")
        .select("user_id, display_name")
        .in("user_id", studentIds)
    : { data: [], error: null };
  if (profileError) return { ok: false, error: profileError.message };

  const nameByStudentId = new Map(
    (profiles ?? []).map((row) => [String(row.user_id), String(row.display_name || "Student")]),
  );
  const emailByUserId = new Map(users.map((user) => [user.id, user.email ?? null]));

  return {
    ok: true,
    data: {
      connections: (connectionResult.data ?? []).map((row) => ({
        id: String(row.id),
        studentId: String(row.student_id),
        studentName: nameByStudentId.get(String(row.student_id)) ?? "Student",
        guardianUserId: String(row.guardian_user_id),
        guardianEmail: emailByUserId.get(String(row.guardian_user_id)) ?? null,
        relationshipType: row.relationship_type === "parent" ? "parent" : "guardian",
        status: row.status === "active" ? "active" : "revoked",
        activatedAt: String(row.activated_at),
        revokedAt: row.revoked_at ? String(row.revoked_at) : null,
      })),
      invitations: (invitationResult.data ?? []).map((row) => ({
        id: String(row.id),
        studentName: nameByStudentId.get(String(row.student_id)) ?? "Student",
        invitedEmail: String(row.invited_email),
        status: String(row.status),
        emailStatus: String(row.email_status),
        expiresAt: String(row.expires_at),
        createdAt: String(row.created_at),
      })),
      auditEvents: (auditResult.data ?? []).map((row) => ({
        id: String(row.id),
        action: String(row.action),
        studentName: row.student_id
          ? nameByStudentId.get(String(row.student_id)) ?? "Student"
          : null,
        actorEmail: row.actor_user_id
          ? emailByUserId.get(String(row.actor_user_id)) ?? null
          : null,
        guardianEmail: row.guardian_user_id
          ? emailByUserId.get(String(row.guardian_user_id)) ?? null
          : null,
        createdAt: String(row.created_at),
      })),
    },
  };
}
