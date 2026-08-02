import "server-only";

import type { TeacherTier } from "@/lib/auth/roles";
import { requireAdminContext } from "@/lib/admin/admin-context";

export type AccessRequestStatus = "pending" | "approved" | "declined";

export type AdminAccessRequest = {
  id: string;
  fullName: string;
  email: string;
  school: string;
  reason: string;
  status: AccessRequestStatus;
  notificationStatus: "pending" | "sent" | "failed";
  notifiedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  provisionedUserId: string | null;
  welcomeEmailStatus: "pending" | "sent" | "failed" | null;
  welcomeEmailedAt: string | null;
  createdAt: string;
};

function mapRow(row: Record<string, unknown>): AdminAccessRequest {
  return {
    id: String(row.id),
    fullName: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    school: String(row.school ?? ""),
    reason: String(row.reason ?? ""),
    status: (row.status as AccessRequestStatus) ?? "pending",
    notificationStatus: (row.notification_status as AdminAccessRequest["notificationStatus"]) ?? "pending",
    notifiedAt: (row.notified_at as string | null) ?? null,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    reviewedBy: (row.reviewed_by as string | null) ?? null,
    reviewNote: (row.review_note as string | null) ?? null,
    provisionedUserId: (row.provisioned_user_id as string | null) ?? null,
    welcomeEmailStatus: (row.welcome_email_status as AdminAccessRequest["welcomeEmailStatus"]) ?? null,
    welcomeEmailedAt: (row.welcome_emailed_at as string | null) ?? null,
    createdAt: String(row.created_at ?? ""),
  };
}

export async function listAdminAccessRequests(opts?: {
  status?: AccessRequestStatus | "all";
  limit?: number;
}): Promise<{ ok: true; requests: AdminAccessRequest[] } | { ok: false; error: string }> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const limit = opts?.limit ?? 100;
  let query = gate.ctx.service
    .from("teacher_access_requests")
    .select(
      "id, full_name, email, school, reason, status, notification_status, notified_at, reviewed_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts?.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false, error: error.message };
  }

  // Optional review / welcome columns (migrations 066–067) — best-effort enrich.
  const ids = (data ?? []).map((row) => String(row.id));
  let extrasById = new Map<string, Record<string, unknown>>();
  if (ids.length > 0) {
    const extras = await gate.ctx.service
      .from("teacher_access_requests")
      .select(
        "id, reviewed_by, review_note, provisioned_user_id, welcome_email_status, welcome_emailed_at",
      )
      .in("id", ids);
    if (!extras.error && extras.data) {
      extrasById = new Map(
        extras.data.map((row) => [String(row.id), row as Record<string, unknown>]),
      );
    }
  }

  return {
    ok: true,
    requests: (data ?? []).map((row) => {
      const base = mapRow(row as Record<string, unknown>);
      const extra = extrasById.get(base.id);
      if (!extra) return base;
      return {
        ...base,
        reviewedBy: (extra.reviewed_by as string | null) ?? null,
        reviewNote: (extra.review_note as string | null) ?? null,
        provisionedUserId: (extra.provisioned_user_id as string | null) ?? null,
        welcomeEmailStatus:
          (extra.welcome_email_status as AdminAccessRequest["welcomeEmailStatus"]) ?? null,
        welcomeEmailedAt: (extra.welcome_emailed_at as string | null) ?? null,
      };
    }),
  };
}

export async function countPendingAccessRequests(): Promise<number> {
  const gate = await requireAdminContext();
  if (!gate.ok) return 0;
  const { count, error } = await gate.ctx.service
    .from("teacher_access_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

export type AdminTeacherSummary = {
  id: string;
  email: string;
  tier: TeacherTier;
  isAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: string | null;
};

export type AdminStudentSummary = {
  userId: string;
  username: string;
  displayName: string;
  learningBand: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const ADMIN_STUDENT_LIST_LIMIT = 1000;

function mapStudentRow(row: Record<string, unknown>): AdminStudentSummary {
  return {
    userId: String(row.user_id),
    username: String(row.username ?? ""),
    displayName: String(row.display_name ?? row.username ?? ""),
    learningBand: (row.learning_band as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

/** All student profiles for the admin Students panel (service role). */
export async function listAdminStudents(): Promise<
  { ok: true; students: AdminStudentSummary[] } | { ok: false; error: string }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const { data, error } = await gate.ctx.service
    .from("student_profiles")
    .select("user_id, username, display_name, learning_band, created_at, updated_at")
    .order("username_normalized", { ascending: true })
    .limit(ADMIN_STUDENT_LIST_LIMIT);

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    students: (data ?? []).map((row) => mapStudentRow(row as Record<string, unknown>)),
  };
}

export async function searchAdminStudents(query: string): Promise<
  { ok: true; students: AdminStudentSummary[] } | { ok: false; error: string }
> {
  const gate = await requireAdminContext();
  if (!gate.ok) return gate;

  const q = query.trim().toLowerCase().replace(/[%_,]/g, "");
  if (!q) {
    return listAdminStudents();
  }

  const pattern = `%${q}%`;
  const [byUsername, byDisplay] = await Promise.all([
    gate.ctx.service
      .from("student_profiles")
      .select("user_id, username, display_name, learning_band, created_at, updated_at")
      .ilike("username_normalized", pattern)
      .order("username_normalized", { ascending: true })
      .limit(ADMIN_STUDENT_LIST_LIMIT),
    gate.ctx.service
      .from("student_profiles")
      .select("user_id, username, display_name, learning_band, created_at, updated_at")
      .ilike("display_name", pattern)
      .order("username_normalized", { ascending: true })
      .limit(ADMIN_STUDENT_LIST_LIMIT),
  ]);

  if (byUsername.error) return { ok: false, error: byUsername.error.message };
  if (byDisplay.error) return { ok: false, error: byDisplay.error.message };

  const byId = new Map<string, AdminStudentSummary>();
  for (const row of [...(byUsername.data ?? []), ...(byDisplay.data ?? [])]) {
    const mapped = mapStudentRow(row as Record<string, unknown>);
    if (byId.has(mapped.userId)) continue;
    byId.set(mapped.userId, mapped);
  }

  return {
    ok: true,
    students: [...byId.values()].sort((a, b) => a.username.localeCompare(b.username)),
  };
}
