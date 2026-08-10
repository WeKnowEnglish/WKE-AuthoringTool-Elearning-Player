"use client";

import { useEffect, useState } from "react";
import {
  classroomRealtimeChannelConfig,
  classroomRealtimeTopic,
} from "@/lib/classroom-realtime/channel";
import { classroomRealtimeShadowModeEnabled } from "@/lib/classroom-realtime/shadow-mode";
import { createClient } from "@/lib/supabase/client";
import type {
  ClassroomParticipantPresence,
  ClassroomRuntimePatch,
  ClassroomRuntimeSnapshot,
} from "@/lib/classroom-realtime/types";

type Input = {
  sessionId: string;
  classId: string;
  userId: string;
  displayName: string;
  role: "host" | "member";
};

export type ClassroomRealtimeShadowHealth = {
  enabled: boolean;
  snapshot: "idle" | "loading" | "loaded" | "failed";
  channel: "idle" | "connecting" | "connected" | "failed";
  snapshotVersion: number | null;
  runtimeSnapshot: ClassroomRuntimeSnapshot | null;
  runtimePatch: ClassroomRuntimePatch | null;
  participants: ClassroomParticipantPresence[];
};

/**
 * Shadow-only Supabase connection. It exercises private-channel authorization,
 * recovery snapshot access, presence, and teardown without supplying any UI
 * state. Liveblocks remains authoritative until a later cutover.
 */
export function useClassroomRealtimeShadowPresence(
  input: Input,
): ClassroomRealtimeShadowHealth {
  const enabled = classroomRealtimeShadowModeEnabled() && Boolean(input.classId.trim());
  const [health, setHealth] = useState<ClassroomRealtimeShadowHealth>({
    enabled,
    snapshot: enabled ? "loading" : "idle",
    channel: enabled ? "connecting" : "idle",
    snapshotVersion: null,
    runtimeSnapshot: null,
    runtimePatch: null,
    participants: [],
  });

  useEffect(() => {
    if (!enabled) {
      setHealth({ enabled: false, snapshot: "idle", channel: "idle", snapshotVersion: null, runtimeSnapshot: null, runtimePatch: null, participants: [] });
      return;
    }

    const supabase = createClient();
    const topic = classroomRealtimeTopic(input.sessionId);
    const channel = supabase.channel(topic, classroomRealtimeChannelConfig(input.userId));
    let disposed = false;
    const controller = new AbortController();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let snapshotVersion: number | null = null;
    setHealth({ enabled: true, snapshot: "loading", channel: "connecting", snapshotVersion: null, runtimeSnapshot: null, runtimePatch: null, participants: [] });

    const readParticipants = (): ClassroomParticipantPresence[] => {
      const state = channel.presenceState<ClassroomParticipantPresence>();
      return Object.values(state)
        .flat()
        .flatMap(({ presence_ref: _presenceRef, ...value }) =>
          typeof value.userId === "string" &&
          typeof value.displayName === "string" &&
          (value.role === "teacher" || value.role === "student")
            ? [value]
            : [],
        );
    };

    const loadSnapshot = async (clearLivePatch = false) => {
      try {
        const response = await fetch(`/api/virtual-classroom/${encodeURIComponent(input.sessionId)}/runtime`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as {
          snapshot?: ClassroomRuntimeSnapshot;
        } | null;
        const nextSnapshot = payload?.snapshot;
        const nextVersion = nextSnapshot?.stateVersion;
        if (typeof nextVersion === "number") snapshotVersion = nextVersion;
        if (!disposed) {
          setHealth((current) => ({
            ...current,
            snapshot: response.ok ? "loaded" : "failed",
            snapshotVersion,
            runtimeSnapshot: response.ok && nextSnapshot ? nextSnapshot : current.runtimeSnapshot,
            runtimePatch: clearLivePatch && response.ok ? null : current.runtimePatch,
          }));
        }
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) {
          setHealth((current) => ({ ...current, snapshot: "failed" }));
        }
      }
    };

    const scheduleSnapshotRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void loadSnapshot(true);
      }, 150);
    };

    // Verify reconnect recovery against the session-scoped cookie before the
    // channel becomes a source of UI state. The response is intentionally not
    // rendered in shadow mode.
    void loadSnapshot();

    channel.on("broadcast", { event: "runtime:updated" }, ({ payload }) => {
      const event = payload as { sessionId?: unknown; stateVersion?: unknown };
      if (
        event.sessionId === input.sessionId &&
        typeof event.stateVersion === "number" &&
        (snapshotVersion === null || event.stateVersion > snapshotVersion)
      ) {
        scheduleSnapshotRefresh();
      }
    });

    channel.on("broadcast", { event: "runtime:patch" }, ({ payload }) => {
      const event = payload as {
        sessionId?: unknown;
        patch?: ClassroomRuntimePatch;
      };
      if (event.sessionId !== input.sessionId || !event.patch) return;
      const patch = event.patch;
      setHealth((current) => ({
        ...current,
        runtimePatch: {
          ...current.runtimePatch,
          ...patch,
          ...(patch.tools
            ? {
                tools: {
                  ...current.runtimePatch?.tools,
                  ...patch.tools,
                },
              }
            : {}),
        },
      }));
    });

    channel.on("presence", { event: "sync" }, () => {
      if (!disposed) {
        setHealth((current) => ({ ...current, participants: readParticipants() }));
      }
    });

    channel.subscribe((status) => {
      if (disposed) return;
      if (status !== "SUBSCRIBED") {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setHealth((current) => ({ ...current, channel: "failed" }));
        }
        return;
      }
      setHealth((current) => ({ ...current, channel: "connected" }));
      void channel.track({
        userId: input.userId,
        displayName: input.displayName,
        role: input.role === "host" ? "teacher" : "student",
        status: "active",
        handRaised: false,
      });
    });

    return () => {
      disposed = true;
      controller.abort();
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, input.displayName, input.role, input.sessionId, input.userId]);

  return health;
}
