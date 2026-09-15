"use client";

import { useEffect, useState } from "react";
import {
  classroomRealtimeChannelConfig,
  classroomRealtimeTopic,
} from "@/lib/classroom-realtime/channel";
import { shouldApplyRealtimeEvent, type ClassroomRealtimeEvent } from "@/lib/classroom-realtime/events";
import type { ClassroomRecoveryState } from "@/lib/classroom-realtime/recovery-feedback";
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
  recovery: ClassroomRecoveryState;
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
    recovery: "idle",
    snapshotVersion: initialSnapshot?.stateVersion ?? null,
    runtimeSnapshot: initialSnapshot,
    runtimePatch: null,
    participants: [],
  });

  useEffect(() => {
    if (!enabled) {
      setHealth({ enabled: false, snapshot: "idle", channel: "idle", recovery: "idle", snapshotVersion: null, runtimeSnapshot: null, runtimePatch: null, participants: [] });
      return;
    }

    const supabase = createClient();
    const topic = classroomRealtimeTopic(input.sessionId);
    const channel = supabase.channel(topic, classroomRealtimeChannelConfig(input.userId));
    let disposed = false;
    const controller = new AbortController();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let snapshotVersion: number | null = initialSnapshot?.stateVersion ?? null;
    let latestObservedVersion: number | null = snapshotVersion;
    let lastPatchAt = 0;
    let reconnectStartedAt: number | null = null;
    let reconnectPending = false;
    let reconnectLoadInFlight = false;
    const diagnosticSurface = input.role === "host" ? "teacher" : "student";
    const diagnosticOptions = {
      classId: input.classId,
      classroomSessionId: input.sessionId,
    };

    const startReconnect = (reason: string) => {
      reconnectPending = true;
      setHealth((current) => ({ ...current, recovery: "reconnecting" }));
      if (reconnectStartedAt != null) return;
      reconnectStartedAt = performance.now();
      recordAppDiagnostic(
        diagnosticSurface,
        "virtual-classroom",
        "classroom_reconnect_started",
        { reason },
        { ...diagnosticOptions, status: "started" },
      );
    };

    const finishReconnect = (ok: boolean, errorCode?: string) => {
      if (reconnectStartedAt == null) return;
      const durationMs = Math.max(0, performance.now() - reconnectStartedAt);
      recordAppDiagnostic(
        diagnosticSurface,
        "virtual-classroom",
        ok ? "classroom_reconnect_recovered" : "classroom_reconnect_failed",
        undefined,
        {
          ...diagnosticOptions,
          kind: ok ? "span" : "error",
          durationMs,
          status: ok ? "recovered" : "failed",
          ...(ok ? {} : { errorCode: errorCode ?? "classroom_reconnect_failed" }),
        },
      );
      reconnectStartedAt = null;
      if (ok) reconnectPending = false;
      setHealth((current) => ({ ...current, recovery: ok ? "recovered" : "failed" }));
    };
    setHealth({
      enabled: true,
      snapshot: initialSnapshot ? "loaded" : "loading",
      channel: "connecting",
      recovery: "idle",
      snapshotVersion,
      runtimeSnapshot: initialSnapshot,
      runtimePatch: null,
      participants: [],
    });

    const readParticipants = (): ClassroomParticipantPresence[] => {
      const state = channel.presenceState<ClassroomParticipantPresence>();
      return Object.values(state)
        .flat()
        .flatMap((value) =>
          typeof value.userId === "string" &&
          typeof value.displayName === "string" &&
          (value.role === "teacher" || value.role === "student")
            ? [value]
            : [],
        );
    };

    const loadSnapshot = async (clearLivePatch = false, reconnectAttempt = false) => {
      if (reconnectAttempt && reconnectLoadInFlight) return;
      if (reconnectAttempt) reconnectLoadInFlight = true;
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
        if (typeof nextVersion === "number") {
          snapshotVersion = nextVersion;
          latestObservedVersion = Math.max(latestObservedVersion ?? 0, nextVersion);
        }
        if (!disposed) {
          setHealth((current) => ({
            ...current,
            snapshot: response.ok ? "loaded" : "failed",
            snapshotVersion,
            runtimeSnapshot: response.ok && nextSnapshot ? nextSnapshot : current.runtimeSnapshot,
            runtimePatch: clearLivePatch && response.ok ? null : current.runtimePatch,
          }));
        }
        if (reconnectAttempt) {
          finishReconnect(response.ok, response.ok ? undefined : `classroom_reconnect_http_${response.status}`);
        }
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        if (!disposed && !aborted) {
          setHealth((current) => ({ ...current, snapshot: "failed" }));
          if (reconnectAttempt) finishReconnect(false, "classroom_reconnect_network_error");
        }
      } finally {
        if (reconnectAttempt) reconnectLoadInFlight = false;
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

    const handleOffline = () => startReconnect("browser_offline");
    const handleOnline = () => {
      startReconnect("browser_online");
      void loadSnapshot(true, true);
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    channel.on("broadcast", { event: "runtime:updated" }, ({ payload }) => {
      const event = payload as { sessionId?: unknown; stateVersion?: unknown };
      if (
        event.sessionId === input.sessionId &&
        typeof event.stateVersion === "number" &&
        (latestObservedVersion === null || event.stateVersion > latestObservedVersion)
      ) {
        latestObservedVersion = event.stateVersion;
        scheduleSnapshotRefresh(Date.now() - lastPatchAt < 1_500 ? 10_000 : 1_200);
      }
    });

    channel.on("broadcast", { event: "classroom:ended" }, ({ payload }) => {
      const event = payload as { sessionId?: unknown; stateVersion?: unknown };
      if (event.sessionId !== input.sessionId || typeof event.stateVersion !== "number") return;
      if (latestObservedVersion !== null && event.stateVersion <= latestObservedVersion) return;
      latestObservedVersion = event.stateVersion;
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
      const event = payload as ClassroomRealtimeEvent;
      if (event.type !== "runtime:patch" || event.sessionId !== input.sessionId || !event.patch) return;
      if (!shouldApplyRealtimeEvent(event, latestObservedVersion)) return;
      if (typeof event.stateVersion === "number") latestObservedVersion = event.stateVersion;
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
          startReconnect(status.toLowerCase());
          finishReconnect(false, `classroom_reconnect_${status.toLowerCase()}`);
        } else if (status === "CLOSED") {
          setHealth((current) => ({ ...current, channel: "connecting" }));
          startReconnect("channel_closed");
        }
        return;
      }
      setHealth((current) => ({ ...current, channel: "connected" }));
      if (reconnectPending) {
        startReconnect("channel_resubscribed");
        void loadSnapshot(true, true);
      }
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
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      void supabase.removeChannel(channel);
    };
  }, [enabled, initialSnapshot, input.classId, input.displayName, input.role, input.sessionId, input.userId]);

  return health;
}
