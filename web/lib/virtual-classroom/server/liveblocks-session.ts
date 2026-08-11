import "server-only";

import { LiveObject } from "@liveblocks/client";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  broadcastClassroomRealtimeEvent,
  broadcastClassroomRuntimeUpdate,
} from "@/lib/classroom-realtime/server/broadcast";
import { snapshotEvent } from "@/lib/classroom-realtime/events";
import { classroomRealtimeLifecycleAuthorityPilotEnabled } from "@/lib/classroom-realtime/shadow-mode";
import {
  setClassroomRuntimeActiveActivity,
  syncClassroomRuntimeSnapshotFromLiveblocks,
} from "@/lib/virtual-classroom/server/runtime-snapshot";
import { mirrorVcRuntimePatchToLiveblocks } from "@/lib/virtual-classroom/server/runtime-mirror";

type MutatorMap = {
  get: (key: string) => { get: (k: string) => unknown; set: (k: string, v: unknown) => void } | undefined;
  set: (key: string, value: unknown) => void;
  has: (key: string) => boolean;
};

export async function ensureVcMember(input: {
  roomId: string;
  userId: string;
  displayName: string;
  role: "host" | "member";
}): Promise<void> {
  const liveblocks = getLiveblocksServerClient();
  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const members = (root as { get: (k: string) => unknown }).get("members") as MutatorMap;
    if (!members.has(input.userId)) {
      members.set(
        input.userId,
        new LiveObject({
          name: input.displayName,
          role: input.role,
          joinedAt: Date.now(),
        }),
      );
    }
  });
}

export async function markVcSessionEndedInStorage(roomId: string): Promise<void> {
  const liveblocks = getLiveblocksServerClient();
  try {
    await liveblocks.mutateStorage(roomId, ({ root }) => {
      const runtime = (root as { get: (k: string) => { set: (k: string, v: unknown) => void } }).get(
        "runtime",
      );
      runtime.set("status", "ended");
      runtime.set("endedAt", Date.now());
      runtime.set("activeActivity", {
        kind: null,
        joinCode: null,
        label: null,
        roundId: null,
        roomId: null,
      });
    });
    await liveblocks.broadcastEvent(roomId, { type: "SESSION_ENDED" });
  } catch {
    // Room may already be gone.
  }
}

export async function setVcActiveActivity(input: {
  roomId: string;
  sessionId?: string;
  classId?: string | null;
  actorUserId?: string;
  kind: "whiteboard" | "document" | "word_cards" | null;
  joinCode: string | null;
  label: string | null;
  roundId?: string | null;
  activityRoomId?: string | null;
}): Promise<void> {
  const activeActivity = {
    kind: input.kind,
    joinCode: input.joinCode,
    label: input.label,
    roundId: input.roundId ?? null,
    roomId: input.activityRoomId ?? null,
  };
  if (
    input.classId &&
    input.sessionId &&
    input.actorUserId &&
    classroomRealtimeLifecycleAuthorityPilotEnabled()
  ) {
    const authority = await setClassroomRuntimeActiveActivity({
      sessionId: input.sessionId,
      actorUserId: input.actorUserId,
      activeActivity,
    });
    if (!authority.ok) throw new Error(authority.error);
    await Promise.all([
      mirrorVcRuntimePatchToLiveblocks({ roomId: input.roomId, patch: authority.patch }),
      authority.changed.length
        ? broadcastClassroomRealtimeEvent({
            type: "runtime:patch",
            sessionId: input.sessionId,
            patch: authority.patch,
            sentAt: Date.now(),
          })
        : Promise.resolve(false),
      authority.changed.length
        ? broadcastClassroomRuntimeUpdate(snapshotEvent(authority.snapshot, authority.changed))
        : Promise.resolve(false),
    ]);
    return;
  }
  const liveblocks = getLiveblocksServerClient();
  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const runtime = (root as { get: (k: string) => { set: (k: string, v: unknown) => void } }).get(
      "runtime",
    );
    runtime.set("activeActivity", activeActivity);
  });
  try {
    await liveblocks.broadcastEvent(input.roomId, {
      type: "ACTIVITY_CHANGED",
      kind: input.kind,
      joinCode: input.joinCode,
      label: input.label,
      roundId: input.roundId ?? null,
      roomId: input.activityRoomId ?? null,
    });
  } catch {
    // best-effort
  }
  if (input.sessionId && input.actorUserId) {
    await Promise.allSettled([
      broadcastClassroomRealtimeEvent({
        type: "runtime:patch",
        sessionId: input.sessionId,
        patch: { activeActivity },
        sentAt: Date.now(),
      }),
      syncClassroomRuntimeSnapshotFromLiveblocks({
        sessionId: input.sessionId,
        roomId: input.roomId,
        actorUserId: input.actorUserId,
      }),
    ]);
  }
}

export async function deleteLiveblocksRooms(roomIds: string[]): Promise<void> {
  const liveblocks = getLiveblocksServerClient();
  for (const roomId of roomIds) {
    if (!roomId) continue;
    try {
      await liveblocks.deleteRoom(roomId);
    } catch {
      // ignore missing rooms
    }
  }
}
