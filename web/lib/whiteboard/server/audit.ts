import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export async function writeWhiteboardAudit(input: {
  roundId: string;
  actorId?: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase.from("whiteboard_audit_events").insert({
    round_id: input.roundId,
    actor_id: input.actorId ?? null,
    event_type: input.eventType,
    payload_json: input.payload ?? {},
  });
}

export async function recordWhiteboardAward(input: {
  awardId: string;
  roundId: string;
  studentId: string;
  teacherId: string;
  rewardType: string;
  goldDelta?: number;
  experienceDelta?: number;
}): Promise<{ created: boolean }> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return { created: true };

  const { error } = await supabase.from("whiteboard_awards").insert({
    id: input.awardId,
    round_id: input.roundId,
    student_id: input.studentId,
    teacher_id: input.teacherId,
    reward_type: input.rewardType,
    gold_delta: input.goldDelta ?? 5,
    experience_delta: input.experienceDelta ?? 10,
  });

  if (error) {
    // Unique violation → duplicate
    if (error.code === "23505") return { created: false };
    return { created: false };
  }
  return { created: true };
}

export async function upsertWhiteboardBoardRow(input: {
  id: string;
  roundId: string;
  ownerType: string;
  ownerId: string;
  revision: number;
  status: string;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase.from("whiteboard_boards").upsert({
    id: input.id,
    round_id: input.roundId,
    owner_type: input.ownerType,
    owner_id: input.ownerId,
    current_revision: input.revision,
    status: input.status,
    updated_at: new Date().toISOString(),
  });
}

export async function createClassSession(input: {
  sessionId: string;
  classId: string;
  title: string;
  createdBy: string;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase.from("class_sessions").upsert({
    id: input.sessionId,
    class_id: input.classId,
    title: input.title,
    status: "active",
    created_by: input.createdBy,
  });
}

export async function archiveWhiteboardRound(input: {
  roundId: string;
  liveblocksRoomId: string;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase
    .from("whiteboard_rounds")
    .update({
      archived_at: new Date().toISOString(),
      phase: "ENDED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.roundId);

  await writeWhiteboardAudit({
    roundId: input.roundId,
    eventType: "ROUND_ARCHIVED",
    payload: { liveblocksRoomId: input.liveblocksRoomId },
  });
}
