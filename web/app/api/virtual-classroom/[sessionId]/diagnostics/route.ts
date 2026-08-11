import { NextResponse } from "next/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

type RouteContext = { params: Promise<{ sessionId: string }> };

type DiagnosticRow = {
  occurred_at: string;
  role: string;
  participant_id: string | null;
  participant_display_name: string | null;
  device_id: string;
  device_category: string | null;
  surface: string;
  phase: string;
  event_name: string;
  event_kind: string;
  duration_ms: number | null;
  status: string | null;
  error_code: string | null;
  metadata: Record<string, unknown> | null;
  app_version: string | null;
};

function percentile(values: number[], fraction: number): number | null {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]);
}

export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) return NextResponse.json({ error: "Classroom not found." }, { status: 404 });
  try {
    await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Teacher access required." },
      { status: 403 },
    );
  }

  const service = createServiceRoleSupabase();
  if (!service) {
    return NextResponse.json({ error: "Diagnostics storage is unavailable." }, { status: 503 });
  }
  const { data, error } = await service
    .from("platform_usage_events")
    .select(
      "occurred_at,role,participant_id,participant_display_name,device_id,device_category,surface,phase,event_name,event_kind,duration_ms,status,error_code,metadata,app_version",
    )
    .eq("classroom_session_id", sessionId)
    .order("occurred_at", { ascending: true })
    .limit(5000);
  if (error) {
    return NextResponse.json({ error: "Could not load classroom diagnostics." }, { status: 500 });
  }

  const rows = (data ?? []) as DiagnosticRow[];
  const participantMap = new Map<string, DiagnosticRow[]>();
  for (const row of rows) {
    const key = row.participant_id || `device:${row.device_id}`;
    participantMap.set(key, [...(participantMap.get(key) ?? []), row]);
  }
  const participants = [...participantMap.entries()].map(([participantId, events]) => {
    const durations = events
      .map((event) => event.duration_ms)
      .filter((value): value is number => typeof value === "number");
    return {
      participantId,
      displayName: events.find((event) => event.participant_display_name)?.participant_display_name ?? "Participant",
      role: events.at(-1)?.role ?? "unknown",
      deviceCategory: events.at(-1)?.device_category ?? "unknown",
      eventCount: events.length,
      errorCount: events.filter((event) => event.event_kind === "error").length,
      measuredInteractionP50Ms: percentile(durations, 0.5),
      measuredInteractionP90Ms: percentile(durations, 0.9),
    };
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    session: {
      id: session.id,
      title: session.title,
      classId: session.classId,
      createdAt: session.createdAt,
      endedAt: session.endedAt,
    },
    summary: {
      participantCount: participants.length,
      eventCount: rows.length,
      errorCount: rows.filter((row) => row.event_kind === "error").length,
      truncated: rows.length >= 5000,
    },
    participants,
    events: rows.map((row) => ({
      at: row.occurred_at,
      participantId: row.participant_id || `device:${row.device_id}`,
      displayName: row.participant_display_name ?? "Participant",
      role: row.role,
      deviceCategory: row.device_category ?? "unknown",
      surface: row.surface,
      phase: row.phase,
      name: row.event_name,
      kind: row.event_kind,
      durationMs: row.duration_ms,
      status: row.status,
      errorCode: row.error_code,
      detail: row.metadata ?? {},
      appVersion: row.app_version,
    })),
  });
}

