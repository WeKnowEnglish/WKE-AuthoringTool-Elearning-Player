import "server-only";

import { logDaily } from "@/lib/daily/log";
import type { DailyCallRole } from "@/lib/daily/types";
import { unixSecondsToIso } from "@/lib/daily/webhook-events";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authUserIdOrNull(participantKey: string): string | null {
  return UUID_RE.test(participantKey) ? participantKey : null;
}

async function findAttendanceRow(input: {
  sessionId: string;
  participantKey: string;
  dailyParticipantId?: string | null;
}) {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;

  const { data: byKey } = await supabase
    .from("class_session_attendance")
    .select(
      "id, join_count, first_joined_at, last_left_at, total_seconds, source, daily_participant_id",
    )
    .eq("session_id", input.sessionId)
    .eq("participant_key", input.participantKey)
    .maybeSingle();

  if (byKey?.id) return byKey;

  if (input.dailyParticipantId) {
    const { data: byDaily } = await supabase
      .from("class_session_attendance")
      .select(
        "id, join_count, first_joined_at, last_left_at, total_seconds, source, daily_participant_id",
      )
      .eq("session_id", input.sessionId)
      .eq("daily_participant_id", input.dailyParticipantId)
      .maybeSingle();
    if (byDaily?.id) return byDaily;
  }

  return null;
}

/**
 * Provisional browser-reported attendance (pilot fallback).
 * Never downgrades a verified row back to provisional.
 */
export async function recordProvisionalAttendanceJoin(input: {
  sessionId: string;
  participantKey: string;
  role: DailyCallRole;
  dailyParticipantId?: string | null;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  const participantKey = input.participantKey.trim().slice(0, 80);
  if (!participantKey) return;

  const now = new Date().toISOString();
  const existing = await findAttendanceRow({
    sessionId: input.sessionId,
    participantKey,
    dailyParticipantId: input.dailyParticipantId,
  });

  if (existing?.id) {
    const keepVerified = existing.source === "verified";
    await supabase
      .from("class_session_attendance")
      .update({
        join_count: (existing.join_count ?? 0) + 1,
        last_left_at: null,
        daily_participant_id:
          input.dailyParticipantId ?? existing.daily_participant_id ?? null,
        role: input.role,
        source: keepVerified ? "verified" : "provisional",
        updated_at: now,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("class_session_attendance").insert({
      session_id: input.sessionId,
      user_id: authUserIdOrNull(participantKey),
      participant_key: participantKey,
      role: input.role,
      daily_participant_id: input.dailyParticipantId ?? null,
      first_joined_at: now,
      join_count: 1,
      total_seconds: 0,
      source: "provisional",
      updated_at: now,
    });
  }

  logDaily("attendance_provisional_join", {
    sessionId: input.sessionId,
    participantKey,
    role: input.role,
  });
}

export async function recordProvisionalAttendanceLeave(input: {
  sessionId: string;
  participantKey: string;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  const participantKey = input.participantKey.trim().slice(0, 80);
  if (!participantKey) return;

  const existing = await findAttendanceRow({
    sessionId: input.sessionId,
    participantKey,
  });
  if (!existing?.id) return;

  const now = Date.now();
  const joined = new Date(existing.first_joined_at as string).getTime();
  const lastLeft = existing.last_left_at
    ? new Date(existing.last_left_at as string).getTime()
    : null;
  const segmentStart = lastLeft && lastLeft > joined ? lastLeft : joined;
  const added =
    Number.isFinite(segmentStart) && now > segmentStart
      ? Math.floor((now - segmentStart) / 1000)
      : 0;

  const keepVerified = existing.source === "verified";
  await supabase
    .from("class_session_attendance")
    .update({
      last_left_at: new Date(now).toISOString(),
      total_seconds: (existing.total_seconds ?? 0) + added,
      source: keepVerified ? "verified" : "provisional",
      updated_at: new Date(now).toISOString(),
    })
    .eq("id", existing.id);

  logDaily("attendance_provisional_leave", {
    sessionId: input.sessionId,
    participantKey,
    addedSeconds: added,
  });
}

/** Webhook-confirmed join. */
export async function recordVerifiedAttendanceJoin(input: {
  sessionId: string;
  participantKey: string;
  role: DailyCallRole;
  dailyParticipantId: string;
  joinedAtUnix?: number;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  const participantKey = input.participantKey.trim().slice(0, 80);
  if (!participantKey) return;

  const joinedAt = unixSecondsToIso(input.joinedAtUnix);
  const now = new Date().toISOString();
  const existing = await findAttendanceRow({
    sessionId: input.sessionId,
    participantKey,
    dailyParticipantId: input.dailyParticipantId,
  });

  if (existing?.id) {
    const rejoin = Boolean(existing.last_left_at);
    await supabase
      .from("class_session_attendance")
      .update({
        participant_key: participantKey,
        user_id: authUserIdOrNull(participantKey),
        join_count: rejoin
          ? (existing.join_count ?? 0) + 1
          : Math.max(1, existing.join_count ?? 1),
        last_left_at: null,
        daily_participant_id: input.dailyParticipantId,
        role: input.role,
        source: "verified",
        first_joined_at: existing.first_joined_at ?? joinedAt,
        updated_at: now,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("class_session_attendance").insert({
      session_id: input.sessionId,
      user_id: authUserIdOrNull(participantKey),
      participant_key: participantKey,
      role: input.role,
      daily_participant_id: input.dailyParticipantId,
      first_joined_at: joinedAt,
      join_count: 1,
      total_seconds: 0,
      source: "verified",
      updated_at: now,
    });
  }

  logDaily("attendance_verified_join", {
    sessionId: input.sessionId,
    participantKey,
    role: input.role,
  });
}

/** Webhook-confirmed leave; prefers Daily duration when present. */
export async function recordVerifiedAttendanceLeave(input: {
  sessionId: string;
  participantKey: string;
  role: DailyCallRole;
  dailyParticipantId: string;
  joinedAtUnix?: number;
  durationSeconds?: number;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  const participantKey = input.participantKey.trim().slice(0, 80);
  if (!participantKey) return;

  const now = new Date();
  const nowIso = now.toISOString();
  const existing = await findAttendanceRow({
    sessionId: input.sessionId,
    participantKey,
    dailyParticipantId: input.dailyParticipantId,
  });

  const duration =
    typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds)
      ? Math.max(0, Math.floor(input.durationSeconds))
      : null;

  if (existing?.id) {
    let totalSeconds = existing.total_seconds ?? 0;
    if (duration != null) {
      // Prefer Daily's segment duration as authoritative for this visit.
      totalSeconds = Math.max(totalSeconds, duration);
    } else {
      const joined = new Date(
        (existing.first_joined_at as string) ?? unixSecondsToIso(input.joinedAtUnix),
      ).getTime();
      const lastLeft = existing.last_left_at
        ? new Date(existing.last_left_at as string).getTime()
        : null;
      const segmentStart = lastLeft && lastLeft > joined ? lastLeft : joined;
      if (Number.isFinite(segmentStart) && now.getTime() > segmentStart) {
        totalSeconds += Math.floor((now.getTime() - segmentStart) / 1000);
      }
    }

    await supabase
      .from("class_session_attendance")
      .update({
        participant_key: participantKey,
        user_id: authUserIdOrNull(participantKey),
        daily_participant_id: input.dailyParticipantId,
        role: input.role,
        last_left_at: nowIso,
        total_seconds: totalSeconds,
        source: "verified",
        updated_at: nowIso,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("class_session_attendance").insert({
      session_id: input.sessionId,
      user_id: authUserIdOrNull(participantKey),
      participant_key: participantKey,
      role: input.role,
      daily_participant_id: input.dailyParticipantId,
      first_joined_at: unixSecondsToIso(input.joinedAtUnix, now),
      last_left_at: nowIso,
      join_count: 1,
      total_seconds: duration ?? 0,
      source: "verified",
      updated_at: nowIso,
    });
  }

  logDaily("attendance_verified_leave", {
    sessionId: input.sessionId,
    participantKey,
    durationSeconds: duration ?? -1,
  });
}

export async function findSessionIdByDailyRoomName(
  roomName: string,
): Promise<string | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("daily_room_name", roomName)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
