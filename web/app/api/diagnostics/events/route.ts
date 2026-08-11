import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppRole, isAdmin } from "@/lib/auth/roles";
import {
  appDiagnosticBatchSchema,
  sanitizeDiagnosticMetadata,
  sanitizeDiagnosticRoute,
} from "@/lib/app-diagnostics/schema";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { VC_HOST_COOKIE, VC_MEMBER_COOKIE } from "@/lib/virtual-classroom/session-cookie";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";
import { resolveVirtualClassroomRuntimeReader } from "@/lib/virtual-classroom/server/runtime-access";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = appDiagnosticBatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid diagnostic event batch." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const classroomSessionIds = [
    ...new Set(
      parsed.data.events
        .map((event) => event.classroomSessionId)
        .filter((value): value is string => Boolean(value && /^vcs_[A-Za-z0-9_-]+$/.test(value))),
    ),
  ];
  if (classroomSessionIds.length > 1) {
    return NextResponse.json({ error: "Send one classroom session per batch." }, { status: 400 });
  }

  let classroomReader: ReturnType<typeof resolveVirtualClassroomRuntimeReader> = null;
  if (classroomSessionIds[0]) {
    const session = await getVirtualClassroomSessionById(classroomSessionIds[0]);
    if (!session) return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
    const cookieStore = await cookies();
    classroomReader = resolveVirtualClassroomRuntimeReader({
      session,
      hostCookie: cookieStore.get(VC_HOST_COOKIE)?.value,
      memberCookie: cookieStore.get(VC_MEMBER_COOKIE)?.value,
    });
    if (!classroomReader) {
      return NextResponse.json({ error: "Classroom membership required." }, { status: 403 });
    }
  }
  if (!user?.id && !classroomReader) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const service = createServiceRoleSupabase();
  if (!service) {
    return NextResponse.json({ error: "Diagnostics storage is unavailable." }, { status: 503 });
  }

  const appRole = user ? getAppRole(user) : null;
  const role = user && isAdmin(user) ? "admin" : appRole ?? (classroomReader ? "student" : "unknown");
  const participantId = classroomReader?.userId ?? user?.id ?? null;
  const participantDisplayName =
    classroomReader?.displayName ??
    (user?.user_metadata?.display_name as string | undefined)?.trim() ??
    null;
  const rows = parsed.data.events.map((event) => ({
    event_id: event.id,
    occurred_at: new Date(event.at).toISOString(),
    user_id: user?.id ?? null,
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
    classroom_session_id:
      event.classroomSessionId && /^vcs_[A-Za-z0-9_-]+$/.test(event.classroomSessionId)
        ? event.classroomSessionId
        : null,
    participant_id: participantId,
    participant_display_name: participantDisplayName,
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
