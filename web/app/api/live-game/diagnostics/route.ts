import { NextResponse } from "next/server";
import { isTeacher } from "@/lib/auth/roles";
import type { LiveGameDiagnosticEvent } from "@/lib/live-game/diagnostics/types";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

const MAX_BATCH = 100;
const MAX_EXPORT_EVENTS = 5_000;
const MAX_DETAIL_BYTES = 20_000;
const RETENTION_MS = 14 * 24 * 60 * 60 * 1_000;
let lastRetentionCleanupAt = 0;

function serviceClient() {
  const client = createServiceRoleSupabase();
  if (!client) throw new Error("LIVE_GAME_DIAGNOSTICS_UNAVAILABLE");
  return client;
}

function validEvent(value: unknown): value is LiveGameDiagnosticEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<LiveGameDiagnosticEvent>;
  const detailBytes = (() => {
    try {
      return JSON.stringify(event.detail ?? {}).length;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  })();
  return typeof event.id === "string" && event.id.length <= 160 &&
    typeof event.traceId === "string" && event.traceId.length <= 160 &&
    typeof event.deviceId === "string" && event.deviceId.length <= 160 &&
    typeof event.at === "number" && Number.isFinite(event.at) &&
    Math.abs(Date.now() - event.at) <= 24 * 60 * 60 * 1_000 &&
    typeof event.roomId === "string" && event.roomId.length <= 160 &&
    ["entry", "room", "lobby", "gameplay", "exit", "report", "system"].includes(event.phase ?? "") &&
    typeof event.name === "string" && event.name.length <= 160 &&
    (event.kind === "mark" || event.kind === "span" || event.kind === "error") &&
    (event.durationMs == null || (Number.isFinite(event.durationMs) && event.durationMs >= 0 && event.durationMs <= 60 * 60_000)) &&
    (event.role == null || event.role === "host" || event.role === "player") &&
    (event.displayName == null || (typeof event.displayName === "string" && event.displayName.length <= 120)) &&
    detailBytes <= MAX_DETAIL_BYTES;
}

function diagnosticDetailForStorage(event: LiveGameDiagnosticEvent) {
  const detail = { ...(event.detail ?? {}) };
  // Performance exports need the question and failure context, not a student's
  // typed response. Keep live diagnostic storage data-minimized.
  delete detail.selectedAnswer;
  return detail;
}

async function cleanupExpiredDiagnostics() {
  const now = Date.now();
  if (now - lastRetentionCleanupAt < 60 * 60_000) return;
  lastRetentionCleanupAt = now;
  const cutoff = new Date(now - RETENTION_MS).toISOString();
  const { error } = await serviceClient()
    .from("live_game_diagnostic_events")
    .delete()
    .lt("captured_at", cutoff);
  if (error) console.error("Live Game diagnostic retention cleanup failed", error);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { events?: unknown[] } | null;
    const events = body?.events?.slice(0, MAX_BATCH) ?? [];
    if (!events.length || !events.every(validEvent)) {
      return NextResponse.json({ error: "Valid diagnostic events are required." }, { status: 400 });
    }
    const roomIds = new Set(events.map((event) => event.roomId));
    if (roomIds.size !== 1) {
      return NextResponse.json({ error: "One room per diagnostic batch is required." }, { status: 400 });
    }
    const roomId = events[0]!.roomId!;
    await requireLiveGamePlayerSession(roomId);

    const rows = events.map((event) => ({
      room_id: roomId,
      event_id: event.id,
      trace_id: event.traceId,
      device_id: event.deviceId,
      event_at: new Date(event.at).toISOString(),
      phase: event.phase,
      event_name: event.name,
      event_kind: event.kind,
      duration_ms: event.durationMs ?? null,
      player_role: event.role ?? null,
      display_name: event.displayName ?? null,
      detail: diagnosticDetailForStorage(event),
    }));
    const { error } = await serviceClient()
      .from("live_game_diagnostic_events")
      .upsert(rows, { onConflict: "room_id,device_id,event_id", ignoreDuplicates: true });
    if (error) throw error;
    await cleanupExpiredDiagnostics();
    return NextResponse.json({ accepted: rows.length });
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    console.error("Live Game diagnostic upload failed", error);
    return NextResponse.json({ error: "Diagnostics are temporarily unavailable." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  try {
    const roomId = new URL(request.url).searchParams.get("roomId")?.trim() ?? "";
    if (!roomId) return NextResponse.json({ error: "roomId is required." }, { status: 400 });
    const playerSession = await requireLiveGamePlayerSession(roomId);
    if (playerSession.role !== "host" || playerSession.accountType !== "authenticated") {
      return NextResponse.json({ error: "Teacher host access is required." }, { status: 403 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isTeacher(user) || user.id !== playerSession.accountUserId) {
      return NextResponse.json({ error: "Teacher host access is required." }, { status: 403 });
    }

    const { data, error } = await serviceClient()
      .from("live_game_diagnostic_events")
      .select("room_id,event_id,trace_id,device_id,event_at,phase,event_name,event_kind,duration_ms,player_role,display_name,detail")
      .eq("room_id", roomId)
      .order("event_at", { ascending: true })
      .limit(MAX_EXPORT_EVENTS);
    if (error) throw error;
    const events: LiveGameDiagnosticEvent[] = (data ?? []).map((row) => ({
      id: row.event_id,
      traceId: row.trace_id,
      deviceId: row.device_id,
      at: new Date(row.event_at).getTime(),
      phase: row.phase,
      name: row.event_name,
      kind: row.event_kind,
      durationMs: row.duration_ms ?? undefined,
      roomId: row.room_id,
      role: row.player_role ?? undefined,
      displayName: row.display_name ?? undefined,
      detail: row.detail ?? {},
    })) as LiveGameDiagnosticEvent[];
    return NextResponse.json({ events }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    console.error("Live Game diagnostic export failed", error);
    return NextResponse.json({ error: "Diagnostics are temporarily unavailable." }, { status: 503 });
  }
}
