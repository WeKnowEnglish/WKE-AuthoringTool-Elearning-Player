"use client";

import { useEffect, useState } from "react";
import {
  classroomRealtimeChannelConfig,
  classroomRealtimeTopic,
} from "@/lib/classroom-realtime/channel";
import { classroomRealtimeShadowModeEnabled } from "@/lib/classroom-realtime/shadow-mode";
import { createClient } from "@/lib/supabase/client";
import type { ClassroomRuntimeSnapshot } from "@/lib/classroom-realtime/types";

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
  });

  useEffect(() => {
    if (!enabled) {
      setHealth({ enabled: false, snapshot: "idle", channel: "idle", snapshotVersion: null, runtimeSnapshot: null });
      return;
    }

    const supabase = createClient();
    const topic = classroomRealtimeTopic(input.sessionId);
    const channel = supabase.channel(topic, classroomRealtimeChannelConfig(input.userId));
    let disposed = false;
    const controller = new AbortController();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let snapshotVersion: number | null = null;
    setHealth({ enabled: true, snapshot: "loading", channel: "connecting", snapshotVersion: null, runtimeSnapshot: null });

    const loadSnapshot = async () => {
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
        void loadSnapshot();
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
