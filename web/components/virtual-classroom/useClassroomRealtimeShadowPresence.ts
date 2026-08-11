"use client";

import { useEffect, useState } from "react";
import {
  classroomRealtimeChannelConfig,
  classroomRealtimeTopic,
} from "@/lib/classroom-realtime/channel";
import { classroomRealtimeShadowModeEnabled } from "@/lib/classroom-realtime/shadow-mode";
import { createClient } from "@/lib/supabase/client";
import {
  diagnosticFetch,
  recordAppDiagnostic,
} from "@/lib/app-diagnostics/client";
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
  initialSnapshot?: ClassroomRuntimeSnapshot | null;
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
  const initialSnapshot = input.initialSnapshot ?? null;
  const [health, setHealth] = useState<ClassroomRealtimeShadowHealth>({
    enabled,
    snapshot: enabled ? (initialSnapshot ? "loaded" : "loading") : "idle",
    channel: enabled ? "connecting" : "idle",
    snapshotVersion: initialSnapshot?.stateVersion ?? null,
    runtimeSnapshot: initialSnapshot,
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
    let snapshotVersion: number | null = initialSnapshot?.stateVersion ?? null;
    let lastPatchAt = 0;
    setHealth({
      enabled: true,
      snapshot: initialSnapshot ? "loaded" : "loading",
      channel: "connecting",
      snapshotVersion,
      runtimeSnapshot: initialSnapshot,
      runtimePatch: null,
      participants: [],
    });

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
        const response = await diagnosticFetch(
          `/api/virtual-classroom/${encodeURIComponent(input.sessionId)}/runtime`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
          {
            surface: input.role === "host" ? "teacher" : "student",
            phase: "virtual-classroom",
            name: clearLivePatch ? "classroom_runtime_refresh" : "classroom_runtime_restore",
            detail: { sessionId: input.sessionId },
          },
        );
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

    const scheduleSnapshotRefresh = (delayMs = 1_200) => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void loadSnapshot(true);
      }, delayMs);
    };

    // Verify reconnect recovery against the session-scoped cookie before the
    // channel becomes a source of UI state. The response is intentionally not
    // rendered in shadow mode.
    if (!initialSnapshot) void loadSnapshot();

    channel.on("broadcast", { event: "runtime:updated" }, ({ payload }) => {
      const event = payload as { sessionId?: unknown; stateVersion?: unknown };
      if (
        event.sessionId === input.sessionId &&
        typeof event.stateVersion === "number" &&
        (snapshotVersion === null || event.stateVersion > snapshotVersion)
      ) {
        scheduleSnapshotRefresh(Date.now() - lastPatchAt < 1_500 ? 10_000 : 1_200);
      }
    });

    channel.on("broadcast", { event: "classroom:ended" }, ({ payload }) => {
      const event = payload as { sessionId?: unknown; stateVersion?: unknown };
      if (event.sessionId !== input.sessionId || typeof event.stateVersion !== "number") return;
      if (!disposed) {
        setHealth((current) => ({
          ...current,
          runtimePatch: {
            ...current.runtimePatch,
            status: "ended",
            activeActivity: {
              kind: null,
              joinCode: null,
              label: null,
              roundId: null,
              roomId: null,
            },
          },
        }));
      }
      scheduleSnapshotRefresh();
    });

    channel.on("broadcast", { event: "runtime:patch" }, ({ payload }) => {
      const event = payload as {
        sessionId?: unknown;
        patch?: ClassroomRuntimePatch;
        sentAt?: unknown;
      };
      if (event.sessionId !== input.sessionId || !event.patch) return;
      const patch = event.patch;
      if (typeof event.sentAt === "number") {
        recordAppDiagnostic(
          input.role === "host" ? "teacher" : "student",
          "virtual-classroom",
          "classroom_realtime_patch_delivery",
          {
            sessionId: input.sessionId,
            patchKeys: Object.keys(patch).sort().join(","),
          },
          {
            kind: "span",
            durationMs: Math.max(0, Date.now() - event.sentAt),
          },
        );
      }
      lastPatchAt = Date.now();
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
      // Broadcast patches already contain the visible state. Rebase from the
      // durable snapshot once the teacher pauses instead of issuing a second
      // recovery request after every click.
      scheduleSnapshotRefresh(10_000);
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
  }, [enabled, initialSnapshot, input.displayName, input.role, input.sessionId, input.userId]);

  return health;
}
