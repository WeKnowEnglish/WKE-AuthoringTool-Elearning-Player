import { NextResponse } from "next/server";
import { getAppRole, isAdmin } from "@/lib/auth/roles";
import {
  appDiagnosticBatchSchema,
  sanitizeDiagnosticMetadata,
  sanitizeDiagnosticRoute,
} from "@/lib/app-diagnostics/schema";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = appDiagnosticBatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid diagnostic event batch." }, { status: 400 });
  }

  const service = createServiceRoleSupabase();
  if (!service) {
    return NextResponse.json({ error: "Diagnostics storage is unavailable." }, { status: 503 });
  }

  const appRole = getAppRole(user);
  const role = isAdmin(user) ? "admin" : appRole ?? "unknown";
  const rows = parsed.data.events.map((event) => ({
    event_id: event.id,
    occurred_at: new Date(event.at).toISOString(),
    user_id: user.id,
    role,
    session_id: event.sessionId,
    device_id: event.deviceId,
    surface: event.surface,
    phase: event.phase,
    event_name: event.name,
    event_kind: event.kind,
    duration_ms: event.durationMs ?? null,
    route: sanitizeDiagnosticRoute(event.route),
    class_id: event.classId ?? null,
    activity_id: event.activityId ?? null,
    homework_id: event.homeworkId ?? null,
    status: event.status ?? null,
    error_code: event.errorCode ?? null,
    metadata: sanitizeDiagnosticMetadata(event.detail),
    app_version: event.appVersion ?? null,
    device_category: event.deviceCategory ?? "unknown",
  }));

  const { error } = await service.from("platform_usage_events").upsert(rows, {
    onConflict: "event_id",
    ignoreDuplicates: true,
  });
  if (error) {
    console.error("platform_usage_events insert failed", error.message);
    return NextResponse.json({ error: "Could not store diagnostics." }, { status: 500 });
  }

  return NextResponse.json({ accepted: rows.map((row) => row.event_id) });
}
