"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall, DailyThemeConfig } from "@daily-co/daily-js";
import { dailyThemeColorsKey } from "@/lib/daily/theme-from-teacher";

export type DailyCallPhase =
  | "idle"
  | "probing"
  | "ready"
  | "connecting"
  | "prejoin"
  | "joined"
  | "disabled"
  | "error";

type TokenResponse = {
  token?: string;
  roomUrl?: string;
  role?: string;
  exp?: number;
  error?: string;
  code?: string;
};

type RoomResponse = {
  roomUrl?: string;
  error?: string;
  code?: string;
};

const REFRESH_BEFORE_EXP_MS = 90_000;

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

async function fetchMeetingToken(sessionId: string): Promise<TokenResponse & { ok: boolean; status: number }> {
  const tokenRes = await fetch(`/api/virtual-classroom/${sessionId}/daily/token`, {
    method: "POST",
  });
  const tokenPayload = (await tokenRes.json()) as TokenResponse;
  return { ...tokenPayload, ok: tokenRes.ok, status: tokenRes.status };
}

export function useDailyCall(input: {
  sessionId: string;
  isHost: boolean;
  sessionEnded: boolean;
  /** Daily Prebuilt theme (from teacher chrome selection). */
  theme?: DailyThemeConfig | null;
}) {
  const { sessionId, isHost, sessionEnded, theme = null } = input;
  const frameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const joinedRef = useRef(false);
  const roomUrlRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshingRef = useRef(false);
  const connectInFlight = useRef(false);
  const themeRef = useRef<DailyThemeConfig | null>(theme);
  const [phase, setPhase] = useState<DailyCallPhase>("probing");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tokenExp, setTokenExp] = useState<number | null>(null);

  themeRef.current = theme;

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const destroyCall = useCallback(
    async (reportLeave: boolean) => {
      clearRefreshTimer();
      roomUrlRef.current = null;
      setTokenExp(null);
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
    },
    [sessionId, clearRefreshTimer],
  );

  const probe = useCallback(async () => {
    setPhase("probing");
    setError(null);
    setErrorCode(null);
    try {
      const res = await fetch(`/api/virtual-classroom/${sessionId}/daily/room`);
      const payload = (await res.json()) as RoomResponse;
      if (res.status === 503 && payload.code === "daily_disabled") {
        setPhase("disabled");
        setError(payload.error ?? "Class video is not configured on this server.");
        setErrorCode("daily_disabled");
        return;
      }
      if (res.ok || payload.code === "room_missing" || res.status === 404) {
        setPhase("ready");
        return;
      }
      if (res.status === 401 || res.status === 403) {
        const code = payload.code ?? "not_authorized";
        if (code === "too_early") {
          setPhase("ready");
          setError(payload.error ?? null);
          setErrorCode(code);
          return;
        }
        setPhase("error");
        setError(payload.error ?? "Not authorized for video.");
        setErrorCode(code);
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
      setIsFullscreen(false);
    });
  }, [sessionEnded, destroyCall]);

  useEffect(() => {
    return () => {
      void destroyCall(true);
    };
  }, [destroyCall]);

  // Keep Prebuilt colors in sync when the teacher changes chrome theme.
  useEffect(() => {
    const call = frameRef.current;
    if (!call || !theme) return;
    void call.setTheme(theme).catch(() => {
      // Theme is cosmetic — never block the call.
    });
  }, [theme]);

  const scheduleTokenRefresh = useCallback(
    (expUnix: number | undefined) => {
      clearRefreshTimer();
      if (!expUnix || !Number.isFinite(expUnix)) return;
      setTokenExp(expUnix);
      const refreshAt = expUnix * 1000 - REFRESH_BEFORE_EXP_MS;
      const delay = Math.max(5_000, refreshAt - Date.now());
      refreshTimerRef.current = setTimeout(() => {
        void (async () => {
          const call = frameRef.current;
          const roomUrl = roomUrlRef.current;
          if (!call || !roomUrl || !joinedRef.current) return;
          refreshingRef.current = true;
          try {
            const tokenPayload = await fetchMeetingToken(sessionId);
            if (!tokenPayload.ok || !tokenPayload.token) {
              setError(
                tokenPayload.error ??
                  "Could not refresh video token. Reconnect if the call drops.",
              );
              setErrorCode(tokenPayload.code ?? "token_refresh_failed");
              return;
            }
            await call.leave();
            await call.join({ url: roomUrl, token: tokenPayload.token });
            const activeTheme = themeRef.current;
            if (activeTheme) {
              try {
                await call.setTheme(activeTheme);
              } catch {
                // ignore
              }
            }
            scheduleTokenRefresh(tokenPayload.exp);
          } catch {
            setError("Video token refresh failed. Try Leave video, then Connect.");
            setErrorCode("token_refresh_failed");
          } finally {
            refreshingRef.current = false;
          }
        })();
      }, delay);
    },
    [clearRefreshTimer, sessionId],
  );

  const tryRequestFullscreen = useCallback(async () => {
    const call = frameRef.current;
    if (!call) return false;
    try {
      await call.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    const call = frameRef.current;
    if (!call) return;
    try {
      call.exitFullscreen();
    } catch {
      // ignore
    }
  }, []);

  const attachCallHandlers = useCallback(
    (call: DailyCall) => {
      call.on("joined-meeting", () => {
        joinedRef.current = true;
        setPhase("joined");
        setError(null);
        setErrorCode(null);
        if (refreshingRef.current) return;
        const local = call.participants()?.local;
        void postAttendance(sessionId, "join", local?.session_id ?? null);
      });

      call.on("left-meeting", () => {
        if (refreshingRef.current) return;
        if (joinedRef.current) {
          joinedRef.current = false;
          void postAttendance(sessionId, "leave");
        }
        if (frameRef.current === call) {
          clearRefreshTimer();
          setPhase((current) => (current === "prejoin" ? current : "ready"));
          setExpanded(false);
          setIsFullscreen(false);
        }
      });

      call.on("fullscreen", () => {
        setIsFullscreen(true);
        setExpanded(true);
      });

      call.on("exited-fullscreen", () => {
        setIsFullscreen(false);
      });

      call.on("error", (event) => {
        const message =
          event && typeof event === "object" && "errorMsg" in event
            ? String((event as { errorMsg?: string }).errorMsg)
            : "Video call error.";
        setError(message);
        setErrorCode("daily_error");
        setPhase((p) => (p === "joined" ? p : "error"));
      });
    },
    [sessionId, clearRefreshTimer],
  );

  const connect = useCallback(async () => {
    if (phase === "disabled" || phase === "joined" || phase === "prejoin") return;
    if (connectInFlight.current) return;
    connectInFlight.current = true;
    setPhase("connecting");
    setError(null);
    setErrorCode(null);
    setExpanded(true);

    try {
      if (isHost) {
        const ensure = await fetch(`/api/virtual-classroom/${sessionId}/daily/room`, {
          method: "POST",
        });
        if (ensure.status === 503) {
          const payload = (await ensure.json()) as RoomResponse;
          setPhase("disabled");
          setError(payload.error ?? "Daily video is not enabled.");
          setErrorCode("daily_disabled");
          return;
        }
      }

      const tokenPayload = await fetchMeetingToken(sessionId);
      if (!tokenPayload.ok || !tokenPayload.token || !tokenPayload.roomUrl) {
        if (tokenPayload.code === "daily_disabled") {
          setPhase("disabled");
          setError(tokenPayload.error ?? "Daily video is not enabled.");
          setErrorCode("daily_disabled");
          return;
        }
        setPhase("error");
        setError(tokenPayload.error ?? "Could not get a video token.");
        setErrorCode(tokenPayload.code ?? "token_failed");
        return;
      }

      const parent = containerRef.current;
      if (!parent) {
        setPhase("error");
        setError("Video panel is not ready yet. Open Video and try again.");
        setErrorCode("panel_missing");
        return;
      }

      let call = frameRef.current;
      if (call) {
        try {
          await call.leave();
        } catch {
          // ok
        }
      } else {
        await destroyCall(false);
        const Daily = (await import("@daily-co/daily-js")).default;
        const activeTheme = themeRef.current;
        call = Daily.createFrame(parent, {
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
            borderRadius: "0",
          },
          showLeaveButton: true,
          showFullscreenButton: true,
          ...(activeTheme ? { theme: activeTheme } : {}),
        });
        frameRef.current = call;
        attachCallHandlers(call);
      }

      roomUrlRef.current = tokenPayload.roomUrl;
      setPhase("prejoin");
      await call.join({
        url: tokenPayload.roomUrl,
        token: tokenPayload.token,
      });
      const activeTheme = themeRef.current;
      if (activeTheme) {
        try {
          await call.setTheme(activeTheme);
        } catch {
          // ignore
        }
      }
      scheduleTokenRefresh(tokenPayload.exp);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Could not connect video.");
      setErrorCode("connect_failed");
      await destroyCall(false);
    } finally {
      connectInFlight.current = false;
    }
  }, [
    phase,
    isHost,
    sessionId,
    destroyCall,
    attachCallHandlers,
    scheduleTokenRefresh,
  ]);

  const leave = useCallback(async () => {
    exitFullscreen();
    await destroyCall(true);
    setPhase("ready");
    setExpanded(false);
    setIsFullscreen(false);
    setError(null);
    setErrorCode(null);
  }, [destroyCall, exitFullscreen]);

  return {
    phase,
    error,
    errorCode,
    expanded,
    setExpanded,
    isFullscreen,
    containerRef,
    connect,
    leave,
    requestFullscreen: tryRequestFullscreen,
    exitFullscreen,
    retryProbe: probe,
    tokenExp,
    themeKey: theme ? dailyThemeColorsKey(theme) : "",
  };
}
