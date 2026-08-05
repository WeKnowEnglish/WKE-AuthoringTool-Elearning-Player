import "server-only";

import { logDaily } from "@/lib/daily/log";
import { deleteDailyRoom } from "@/lib/daily/rooms";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

const DEFAULT_ROOM_LIMIT = 25;
const DEFAULT_WEBHOOK_RETENTION_DAYS = 14;

export type DailyCleanupResult = {
  roomsCleared: number;
  roomsFailed: number;
  webhookEventsPruned: number;
};

/**
 * Delete Daily rooms that outlived their TTL or belong to ended sessions,
 * then clear session metadata. Best-effort; safe to run on a cron.
 */
export async function cleanupExpiredDailyRooms(
  limit = DEFAULT_ROOM_LIMIT,
): Promise<Pick<DailyCleanupResult, "roomsCleared" | "roomsFailed">> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) {
    return { roomsCleared: 0, roomsFailed: 0 };
  }

  const nowIso = new Date().toISOString();
  const cap = Math.max(1, Math.min(limit, 100));

  const [{ data: expiredRows, error: expiredError }, { data: endedRows, error: endedError }] =
    await Promise.all([
      supabase
        .from("class_sessions")
        .select("id, daily_room_name")
        .not("daily_room_name", "is", null)
        .lt("daily_room_expires_at", nowIso)
        .limit(cap),
      supabase
        .from("class_sessions")
        .select("id, daily_room_name")
        .not("daily_room_name", "is", null)
        .eq("status", "ended")
        .limit(cap),
    ]);

  if (expiredError || endedError) {
    logDaily("cleanup_query_failed", {
      message: expiredError?.message ?? endedError?.message ?? "unknown",
    });
    return { roomsCleared: 0, roomsFailed: 0 };
  }

  const byId = new Map<string, string>();
  for (const row of [...(expiredRows ?? []), ...(endedRows ?? [])] as Array<{
    id: string;
    daily_room_name: string | null;
  }>) {
    if (row.daily_room_name) byId.set(row.id, row.daily_room_name);
  }

  let roomsCleared = 0;
  let roomsFailed = 0;

  for (const [sessionId, roomName] of byId) {
    try {
      await deleteDailyRoom(roomName);
      const { error: updateError } = await supabase
        .from("class_sessions")
        .update({
          daily_room_name: null,
          daily_room_url: null,
          daily_room_created_at: null,
          daily_room_expires_at: nowIso,
          transcription_enabled: false,
          recording_enabled: false,
        })
        .eq("id", sessionId)
        .eq("daily_room_name", roomName);
      if (updateError) {
        roomsFailed += 1;
        logDaily("cleanup_session_clear_failed", {
          sessionId,
          message: updateError.message,
        });
        continue;
      }
      roomsCleared += 1;
      logDaily("cleanup_room_cleared", { sessionId, roomName });
    } catch (err) {
      roomsFailed += 1;
      logDaily("cleanup_room_failed", {
        sessionId,
        roomName,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return { roomsCleared, roomsFailed };
}

export async function pruneOldDailyWebhookEvents(
  retentionDays = DEFAULT_WEBHOOK_RETENTION_DAYS,
): Promise<number> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return 0;
  const cutoff = new Date(
    Date.now() - Math.max(1, retentionDays) * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("daily_webhook_events")
    .delete()
    .lt("received_at", cutoff)
    .select("event_id");

  if (error) {
    logDaily("cleanup_webhook_prune_failed", { message: error.message });
    return 0;
  }
  return (data ?? []).length;
}

export async function runDailyMaintenanceCleanup(input?: {
  roomLimit?: number;
  webhookRetentionDays?: number;
}): Promise<DailyCleanupResult> {
  const rooms = await cleanupExpiredDailyRooms(input?.roomLimit);
  const webhookEventsPruned = await pruneOldDailyWebhookEvents(
    input?.webhookRetentionDays,
  );
  return {
    ...rooms,
    webhookEventsPruned,
  };
}
