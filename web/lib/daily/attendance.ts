import "server-only";

import { logDaily } from "@/lib/daily/log";
import type { DailyCallRole } from "@/lib/daily/types";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authUserIdOrNull(participantKey: string): string | null {
  return UUID_RE.test(participantKey) ? participantKey : null;
}

/**
 * Provisional browser-reported attendance (Phase 1 pilot).
 * Not authoritative until verified Daily webhook processing (Phase 2).
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
  const { data: existing } = await supabase
    .from("class_session_attendance")
    .select("id, join_count")
    .eq("session_id", input.sessionId)
    .eq("participant_key", participantKey)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("class_session_attendance")
      .update({
        join_count: (existing.join_count ?? 0) + 1,
        last_left_at: null,
        daily_participant_id: input.dailyParticipantId ?? null,
        role: input.role,
        source: "provisional",
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

  const { data: existing } = await supabase
    .from("class_session_attendance")
    .select("id, first_joined_at, last_left_at, total_seconds")
    .eq("session_id", input.sessionId)
    .eq("participant_key", participantKey)
    .maybeSingle();

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

  await supabase
    .from("class_session_attendance")
    .update({
      last_left_at: new Date(now).toISOString(),
      total_seconds: (existing.total_seconds ?? 0) + added,
      source: "provisional",
      updated_at: new Date(now).toISOString(),
    })
    .eq("id", existing.id);

  logDaily("attendance_provisional_leave", {
    sessionId: input.sessionId,
    participantKey,
    addedSeconds: added,
  });
}
