"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";

export type DailyCallPhase =
  | "idle"
  | "probing"
  | "ready"
  | "connecting"
  | "joined"
  | "disabled"
  | "error";

type TokenResponse = {
  token?: string;
  roomUrl?: string;
  role?: string;
  error?: string;
  code?: string;
};

type RoomResponse = {
  roomUrl?: string;
  error?: string;
  code?: string;
};

async function postAttendance(
  sessionId: string,
  event: "join" | "leave",
  dailyParticipantId?: string | null,
): Promise<void> {
  try {
    await fetch(`/api/virtual-classroom/${sessionId}/daily/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, dailyParticipantId: dailyParticipantId ?? null }),
    });
  } catch {
    // Provisional only — never block leave/join UX.
  }
}

export function useDailyCall(input: {
  sessionId: string;
  isHost: boolean;
  /** When true, tear down the call (session ended). */
  sessionEnded: boolean;
}) {
  const { sessionId, isHost, sessionEnded } = input;
  const frameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const joinedRef = useRef(false);
  const [phase, setPhase] = useState<DailyCallPhase>("probing");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const destroyCall = useCallback(async (reportLeave: boolean) => {
    const call = frameRef.current;
    frameRef.current = null;
    if (joinedRef.current && reportLeave) {
      joinedRef.current = false;
      await postAttendance(sessionId, "leave");
    } else {
      joinedRef.current = false;
    }
    if (!call) return;
    try {
      await call.leave();
    } catch {
      // already left
    }
    try {
      call.destroy();
    } catch {
      // already destroyed
    }
  }, [sessionId]);

  const probe = useCallback(async () => {
    setPhase("probing");
    setError(null);
    try {
      const res = await fetch(`/api/virtual-classroom/${sessionId}/daily/room`);
      const payload = (await res.json()) as RoomResponse;
      if (res.status === 503 && payload.code === "daily_disabled") {
        setPhase("disabled");
        return;
      }
      if (res.ok || payload.code === "room_missing" || res.status === 404) {
        setPhase("ready");
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setPhase("error");
        setError(payload.error ?? "Not authorized for video.");
        return;
      }
      setPhase("ready");
    } catch {
      setPhase("ready");
    }
  }, [sessionId]);

  useEffect(() => {
    void probe();
  }, [probe]);

  useEffect(() => {
    if (!sessionEnded) return;
    void destroyCall(true).then(() => {
      setPhase((p) => (p === "disabled" ? p : "ready"));
      setExpanded(false);
    });
  }, [sessionEnded, destroyCall]);

  useEffect(() => {
    return () => {
      void destroyCall(true);
    };
  }, [destroyCall]);

  const connectInFlight = useRef(false);

  const connect = useCallback(async () => {
    if (phase === "disabled" || phase === "joined") return;
    if (connectInFlight.current) return;
    connectInFlight.current = true;
    setPhase("connecting");
    setError(null);
    setExpanded(true);

    try {
      if (isHost) {
        const ensure = await fetch(
          `/api/virtual-classroom/${sessionId}/daily/room`,
          { method: "POST" },
        );
        if (ensure.status === 503) {
          const payload = (await ensure.json()) as RoomResponse;
          setPhase("disabled");
          setError(payload.error ?? "Daily video is not enabled.");
          return;
        }
      }

      const tokenRes = await fetch(
        `/api/virtual-classroom/${sessionId}/daily/token`,
        { method: "POST" },
      );
      const tokenPayload = (await tokenRes.json()) as TokenResponse;
      if (!tokenRes.ok || !tokenPayload.token || !tokenPayload.roomUrl) {
        if (tokenPayload.code === "daily_disabled") {
          setPhase("disabled");
          setError(tokenPayload.error ?? "Daily video is not enabled.");
          return;
        }
        setPhase("error");
        setError(tokenPayload.error ?? "Could not get a video token.");
        return;
      }

      const parent = containerRef.current;
      if (!parent) {
        setPhase("error");
        setError("Video panel is not ready yet. Open Video and try again.");
        return;
      }

      await destroyCall(false);

      const Daily = (await import("@daily-co/daily-js")).default;
      const call = Daily.createFrame(parent, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "0.75rem",
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });
      frameRef.current = call;

      call.on("joined-meeting", () => {
        joinedRef.current = true;
        setPhase("joined");
        const local = call.participants()?.local;
        void postAttendance(sessionId, "join", local?.session_id ?? null);
      });

      call.on("left-meeting", () => {
        if (joinedRef.current) {
          joinedRef.current = false;
          void postAttendance(sessionId, "leave");
        }
        setPhase("ready");
        setExpanded(false);
      });

      call.on("error", (event) => {
        const message =
          event && typeof event === "object" && "errorMsg" in event
            ? String((event as { errorMsg?: string }).errorMsg)
            : "Video call error.";
        setError(message);
        setPhase("error");
      });

      await call.join({
        url: tokenPayload.roomUrl,
        token: tokenPayload.token,
      });
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Could not connect video.");
      await destroyCall(false);
    } finally {
      connectInFlight.current = false;
    }
  }, [phase, isHost, sessionId, destroyCall]);

  const leave = useCallback(async () => {
    await destroyCall(true);
    setPhase("ready");
    setExpanded(false);
  }, [destroyCall]);

  return {
    phase,
    error,
    expanded,
    setExpanded,
    containerRef,
    connect,
    leave,
    retryProbe: probe,
  };
}
