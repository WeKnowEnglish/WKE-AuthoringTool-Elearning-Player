import "server-only";
import { listAuthUsersPaginated, requireAdminContext } from "@/lib/admin/admin-context";
import type { AppDiagnosticKind, AppDiagnosticSurface } from "@/lib/app-diagnostics/types";

export type CentralDiagnosticEvent = {
  id: string;
  occurredAt: string;
  receivedAt: string;
  userLabel: string;
  role: string;
  sessionId: string;
  deviceId: string;
  surface: AppDiagnosticSurface;
  phase: string;
  name: string;
  kind: AppDiagnosticKind;
  durationMs: number | null;
  route: string | null;
  classId: string | null;
  activityId: string | null;
  homeworkId: string | null;
  status: string | null;
  errorCode: string | null;
  metadata: Record<string, unknown>;
  appVersion: string | null;
  deviceCategory: string | null;
};

type DiagnosticRow = {
  event_id: string;
  occurred_at: string;
  received_at: string;
  user_id: string;
  role: string;
  session_id: string;
  device_id: string;
  surface: AppDiagnosticSurface;
  phase: string;
  event_name: string;
  event_kind: AppDiagnosticKind;
  duration_ms: number | null;
  route: string | null;
  class_id: string | null;
  activity_id: string | null;
  homework_id: string | null;
  status: string | null;
  error_code: string | null;
  metadata: Record<string, unknown> | null;
  app_version: string | null;
  device_category: string | null;
};

export async function listRecentCentralDiagnostics(hours = 24): Promise<{
  events: CentralDiagnosticEvent[];
  error: string | null;
}> {
  const admin = await requireAdminContext();
  if (!admin.ok) return { events: [], error: admin.error };

  const since = new Date(Date.now() - Math.max(1, Math.min(hours, 168)) * 3_600_000).toISOString();
  const { data, error } = await admin.ctx.service
    .from("platform_usage_events")
    .select("event_id,occurred_at,received_at,user_id,role,session_id,device_id,surface,phase,event_name,event_kind,duration_ms,route,class_id,activity_id,homework_id,status,error_code,metadata,app_version,device_category")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(2_000);

  if (error) {
    const missingTable = error.message.includes("platform_usage_events");
    return {
      events: [],
      error: missingTable
        ? "Central diagnostics will appear after migration 088 is applied."
        : error.message,
    };
  }

  const users = await listAuthUsersPaginated(admin.ctx.service);
  const labels = new Map(users.map((user) => [
    user.id,
    String(user.user_metadata?.username ?? user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Unknown user"),
  ]));

  return {
    error: null,
    events: ((data ?? []) as DiagnosticRow[]).map((row) => ({
      id: row.event_id,
      occurredAt: row.occurred_at,
      receivedAt: row.received_at,
      userLabel: labels.get(row.user_id) ?? "Unknown user",
      role: row.role,
      sessionId: row.session_id,
      deviceId: row.device_id,
      surface: row.surface,
      phase: row.phase,
      name: row.event_name,
      kind: row.event_kind,
      durationMs: row.duration_ms,
      route: row.route,
      classId: row.class_id,
      activityId: row.activity_id,
      homeworkId: row.homework_id,
      status: row.status,
      errorCode: row.error_code,
      metadata: row.metadata ?? {},
      appVersion: row.app_version,
      deviceCategory: row.device_category,
    })),
  };
}

