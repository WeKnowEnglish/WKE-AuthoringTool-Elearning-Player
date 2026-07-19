import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type {
  VirtualClassroomSessionRecord,
  VirtualClassroomSessionStatus,
} from "@/lib/virtual-classroom/domain";

function mapRow(row: Record<string, unknown>): VirtualClassroomSessionRecord {
  return {
    id: row.id as string,
    classId: (row.class_id as string | null) ?? null,
    joinCode: (row.join_code as string) ?? "",
    liveblocksRoomId: (row.liveblocks_room_id as string) ?? "",
    title: row.title as string,
    status: row.status as VirtualClassroomSessionStatus,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    endedAt: (row.ended_at as string | null) ?? null,
  };
}

export async function endActiveSessionsForClass(classId: string): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase
    .from("class_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("class_id", classId)
    .eq("status", "active");
}

/** Ends other active one-off sessions created by this teacher. */
export async function endActiveOneOffSessionsForTeacher(teacherId: string): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase
    .from("class_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("created_by", teacherId)
    .is("class_id", null)
    .eq("status", "active");
}

export async function createVirtualClassroomSession(input: {
  id: string;
  classId: string | null;
  joinCode: string;
  liveblocksRoomId: string;
  title: string;
  createdBy: string;
}): Promise<void> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;

  if (input.classId) {
    await endActiveSessionsForClass(input.classId);
  } else {
    await endActiveOneOffSessionsForTeacher(input.createdBy);
  }

  await supabase.from("class_sessions").upsert({
    id: input.id,
    class_id: input.classId,
    join_code: input.joinCode,
    liveblocks_room_id: input.liveblocksRoomId,
    title: input.title,
    status: "active",
    created_by: input.createdBy,
    ended_at: null,
  });
}

export async function getVirtualClassroomSessionByJoinCode(
  joinCode: string,
): Promise<VirtualClassroomSessionRecord | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("join_code", joinCode.toUpperCase())
    .maybeSingle();
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getVirtualClassroomSessionById(
  sessionId: string,
): Promise<VirtualClassroomSessionRecord | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getActiveVirtualClassroomForClass(
  classId: string,
): Promise<VirtualClassroomSessionRecord | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("class_id", classId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function endVirtualClassroomSession(
  sessionId: string,
): Promise<VirtualClassroomSessionRecord | null> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return null;
  const endedAt = new Date().toISOString();
  const { data } = await supabase
    .from("class_sessions")
    .update({
      status: "ended",
      ended_at: endedAt,
    })
    .eq("id", sessionId)
    .select("*")
    .maybeSingle();
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function listWhiteboardRoomsForClassSession(
  classSessionId: string,
): Promise<string[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("whiteboard_rounds")
    .select("liveblocks_room_id")
    .eq("session_id", classSessionId);
  return (data ?? [])
    .map((row) => row.liveblocks_room_id as string)
    .filter(Boolean);
}
