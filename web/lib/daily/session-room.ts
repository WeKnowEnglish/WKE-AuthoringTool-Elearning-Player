import "server-only";

import { createPrivateDailyRoom, deleteDailyRoom } from "@/lib/daily/rooms";
import { logDaily } from "@/lib/daily/log";
import {
  adHocDailyRoomExpiresAt,
  resolveDailyScheduleBind,
} from "@/lib/daily/schedule-bind";
import type { DailyRoomRecord } from "@/lib/daily/types";
import { isDailyEnabled } from "@/lib/env/daily-server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type { VirtualClassroomSessionRecord } from "@/lib/virtual-classroom/domain";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

export type VirtualClassroomSessionWithDaily = VirtualClassroomSessionRecord & {
  dailyRoomName: string | null;
  dailyRoomUrl: string | null;
  dailyRoomCreatedAt: string | null;
  dailyRoomExpiresAt: string | null;
  transcriptionEnabled: boolean;
  recordingEnabled: boolean;
};

function mapDailyFields(row: Record<string, unknown>): Pick<
  VirtualClassroomSessionWithDaily,
  | "dailyRoomName"
  | "dailyRoomUrl"
  | "dailyRoomCreatedAt"
  | "dailyRoomExpiresAt"
  | "transcriptionEnabled"
  | "recordingEnabled"
> {
  return {
    dailyRoomName: (row.daily_room_name as string | null) ?? null,
    dailyRoomUrl: (row.daily_room_url as string | null) ?? null,
    dailyRoomCreatedAt: (row.daily_room_created_at as string | null) ?? null,
    dailyRoomExpiresAt: (row.daily_room_expires_at as string | null) ?? null,
    transcriptionEnabled: Boolean(row.transcription_enabled),
    recordingEnabled: Boolean(row.recording_enabled),
  };
}

export async function getVirtualClassroomSessionWithDaily(
  sessionId: string,
): Promise<VirtualClassroomSessionWithDaily | null> {
  const base = await getVirtualClassroomSessionById(sessionId);
  if (!base) return null;
  const supabase = createServiceRoleSupabase();
  if (!supabase) {
    return {
      ...base,
      dailyRoomName: null,
      dailyRoomUrl: null,
      dailyRoomCreatedAt: null,
      dailyRoomExpiresAt: null,
      transcriptionEnabled: false,
      recordingEnabled: false,
    };
  }
  const { data } = await supabase
    .from("class_sessions")
    .select(
      "daily_room_name, daily_room_url, daily_room_created_at, daily_room_expires_at, transcription_enabled, recording_enabled",
    )
    .eq("id", sessionId)
    .maybeSingle();
  return {
    ...base,
    ...mapDailyFields((data ?? {}) as Record<string, unknown>),
  };
}

/**
 * Idempotent: reuse existing Daily room on the session row, or create once.
 * Concurrent hosts: unique room name + re-read after create race.
 */
export async function getOrCreateDailyRoomForSession(
  sessionId: string,
): Promise<DailyRoomRecord | null> {
  if (!isDailyEnabled()) return null;

  const existing = await getVirtualClassroomSessionWithDaily(sessionId);
  if (!existing) return null;
  if (existing.dailyRoomName && existing.dailyRoomUrl) {
    logDaily("room_reused", { sessionId, roomName: existing.dailyRoomName });
    return {
      name: existing.dailyRoomName,
      url: existing.dailyRoomUrl,
      createdAt: existing.dailyRoomCreatedAt ?? new Date().toISOString(),
      expiresAt:
        existing.dailyRoomExpiresAt ??
        new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    };
  }

  const bind = await resolveDailyScheduleBind({
    classId: existing.classId,
    createdAt: existing.createdAt,
  });
  const expiresAt = bind?.roomExpiresAt ?? adHocDailyRoomExpiresAt();

  const room = await createPrivateDailyRoom({ sessionId, expiresAt });
  const supabase = createServiceRoleSupabase();
  if (!supabase) {
    await deleteDailyRoom(room.name);
    throw new Error("Supabase service role required to persist Daily room.");
  }

  // Only write if still empty — first writer wins.
  const { data: updated, error } = await supabase
    .from("class_sessions")
    .update({
      daily_room_name: room.name,
      daily_room_url: room.url,
      daily_room_created_at: room.createdAt,
      daily_room_expires_at: room.expiresAt,
      transcription_enabled: false,
      recording_enabled: false,
    })
    .eq("id", sessionId)
    .is("daily_room_name", null)
    .select(
      "daily_room_name, daily_room_url, daily_room_created_at, daily_room_expires_at",
    )
    .maybeSingle();

  if (error) {
    logDaily("room_persist_failed", { sessionId, message: error.message });
    await deleteDailyRoom(room.name);
    throw new Error(error.message);
  }

  if (!updated) {
    // Lost race — another request persisted first; drop orphan room.
    await deleteDailyRoom(room.name);
    const again = await getVirtualClassroomSessionWithDaily(sessionId);
    if (again?.dailyRoomName && again.dailyRoomUrl) {
      logDaily("room_reused_after_race", {
        sessionId,
        roomName: again.dailyRoomName,
      });
      return {
        name: again.dailyRoomName,
        url: again.dailyRoomUrl,
        createdAt: again.dailyRoomCreatedAt ?? room.createdAt,
        expiresAt: again.dailyRoomExpiresAt ?? room.expiresAt,
      };
    }
    throw new Error("Could not attach Daily room to session.");
  }

  return room;
}

export async function clearDailyRoomOnSessionEnd(sessionId: string): Promise<void> {
  const session = await getVirtualClassroomSessionWithDaily(sessionId);
  if (!session?.dailyRoomName) return;
  await deleteDailyRoom(session.dailyRoomName);
  const supabase = createServiceRoleSupabase();
  if (!supabase) return;
  await supabase
    .from("class_sessions")
    .update({
      daily_room_expires_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}
