import "server-only";

import { dailyRequest, type DailyFetch } from "@/lib/daily/client";
import {
  computeDailyRoomExpiresAt,
} from "@/lib/daily/join-window";
import { logDaily } from "@/lib/daily/log";
import { opaqueDailyRoomName } from "@/lib/daily/room-name";
import type { DailyRoomRecord } from "@/lib/daily/types";
import { DailyApiError } from "@/lib/daily/types";

type DailyRoomApiResponse = {
  name?: string;
  url?: string;
  created_at?: string;
  config?: { exp?: number };
};

export async function createPrivateDailyRoom(input: {
  sessionId: string;
  expiresAt?: Date;
  fetchImpl?: DailyFetch;
}): Promise<DailyRoomRecord> {
  const name = opaqueDailyRoomName(input.sessionId);
  const expiresAt = input.expiresAt ?? computeDailyRoomExpiresAt();
  const expUnix = Math.floor(expiresAt.getTime() / 1000);

  try {
    const created = await dailyRequest<DailyRoomApiResponse>("/rooms", {
      method: "POST",
      fetchImpl: input.fetchImpl,
      body: {
        name,
        privacy: "private",
        properties: {
          exp: expUnix,
          enable_chat: false,
          // Cloud allowed for host REST start/stop; tokens keep enable_recording
          // false + start_cloud_recording false so Prebuilt never auto-records.
          enable_recording: "cloud",
          enable_transcription_storage: true,
          start_video_off: false,
          start_audio_off: false,
          eject_at_room_exp: true,
        },
      },
    });

    const record: DailyRoomRecord = {
      name: created.name ?? name,
      url: created.url ?? "",
      createdAt: created.created_at ?? new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    if (!record.url) {
      throw new DailyApiError("Daily room response missing url.", 502);
    }

    logDaily("room_created", {
      sessionId: input.sessionId,
      roomName: record.name,
    });
    return record;
  } catch (error) {
    // Idempotent: room already exists for this opaque name.
    if (error instanceof DailyApiError && error.status === 400) {
      const existing = await dailyRequest<DailyRoomApiResponse>(`/rooms/${name}`, {
        fetchImpl: input.fetchImpl,
      });
      if (existing.name && existing.url) {
        logDaily("room_reused_existing", {
          sessionId: input.sessionId,
          roomName: existing.name,
        });
        return {
          name: existing.name,
          url: existing.url,
          createdAt: existing.created_at ?? new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        };
      }
    }
    throw error;
  }
}

export async function deleteDailyRoom(
  roomName: string,
  fetchImpl?: DailyFetch,
): Promise<void> {
  if (!roomName.trim()) return;
  try {
    await dailyRequest(`/rooms/${encodeURIComponent(roomName)}`, {
      method: "DELETE",
      fetchImpl,
    });
    logDaily("room_deleted", { roomName });
  } catch (error) {
    logDaily("room_delete_failed", {
      roomName,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
