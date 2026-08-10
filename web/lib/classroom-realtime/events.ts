import type {
  ClassroomRuntimePatch,
  ClassroomRuntimeSnapshot,
} from "@/lib/classroom-realtime/types";

/**
 * Events are ordered by the durable runtime snapshot version when they change
 * shared classroom state.  Receivers ignore stale versions and reload a
 * snapshot after reconnect rather than replaying an event history.
 */
export type ClassroomRealtimeEvent =
  | {
      type: "runtime:patch";
      sessionId: string;
      patch: ClassroomRuntimePatch;
      sentAt: number;
    }
  | {
      type: "runtime:updated";
      sessionId: string;
      stateVersion: number;
      changed: readonly string[];
      sentAt: number;
    }
  | {
      type: "classroom:ended";
      sessionId: string;
      stateVersion: number;
      sentAt: number;
    }
  | {
      type: "presence:hand";
      sessionId: string;
      userId: string;
      raised: boolean;
      sentAt: number;
    };

export type ClassroomRealtimeCommand =
  | {
      type: "teacher:runtime-command";
      sessionId: string;
      command: string;
      payload: Record<string, unknown>;
    }
  | {
      type: "student:status";
      sessionId: string;
      status: string;
    };

export function shouldApplyRealtimeEvent(
  event: ClassroomRealtimeEvent,
  currentSnapshotVersion: number | null,
): boolean {
  if (event.type === "presence:hand" || event.type === "runtime:patch") return true;
  return currentSnapshotVersion === null || event.stateVersion > currentSnapshotVersion;
}

export function snapshotEvent(
  snapshot: ClassroomRuntimeSnapshot,
  changed: readonly string[],
): Extract<ClassroomRealtimeEvent, { stateVersion: number }> {
  return {
    type: snapshot.status === "ended" ? "classroom:ended" : "runtime:updated",
    sessionId: snapshot.sessionId,
    stateVersion: snapshot.stateVersion,
    ...(snapshot.status === "ended" ? {} : { changed }),
    sentAt: Date.now(),
  } as Extract<ClassroomRealtimeEvent, { stateVersion: number }>;
}
