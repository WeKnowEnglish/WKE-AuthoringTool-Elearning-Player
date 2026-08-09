import "server-only";

import type { ClassroomRealtimeEvent } from "@/lib/classroom-realtime/events";
import { classroomRealtimeTopic } from "@/lib/classroom-realtime/channel";

/**
 * Sends a tiny version notification after a durable runtime write. Receivers
 * recover the full snapshot through the authenticated route; no classroom
 * state is placed on the realtime channel.
 */
export async function broadcastClassroomRuntimeUpdate(
  event: Extract<ClassroomRealtimeEvent, { type: "runtime:updated" | "classroom:ended" }>,
): Promise<boolean> {
  const url =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) return false;

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            topic: classroomRealtimeTopic(event.sessionId),
            event: event.type,
            payload: event,
            private: true,
          },
        ],
      }),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    // Liveblocks remains authoritative during this migration, so notification
    // failures must never affect a teacher action.
    return false;
  }
}
