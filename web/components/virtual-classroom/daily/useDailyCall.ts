"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall, DailyThemeConfig } from "@daily-co/daily-js";
import { dailyThemeColorsKey } from "@/lib/daily/theme-from-teacher";
import { canRecoverDailyFatalError, canRetryDailyRequest, DAILY_RETRY_DELAYS_MS, dailyResumeKey, parseDailyResume, type DailyResume } from "@/lib/daily/recovery";
import { diagnosticFetch, recordAppDiagnostic, startAppDiagnosticSpan } from "@/lib/app-diagnostics/client";

export type DailyCallPhase = "idle" | "probing" | "ready" | "connecting" | "prejoin" | "joined" | "disabled" | "error";
type TokenResponse = { token?: string; roomUrl?: string; role?: string; exp?: number; error?: string; code?: string };
const SIGNALING_RECOVERY_GRACE_MS = 30_000;

async function postAttendance(sessionId: string, event: "join" | "leave", dailyParticipantId?: string | null) {
  try {
    await fetch(`/api/virtual-classroom/${sessionId}/daily/attendance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, dailyParticipantId: dailyParticipantId ?? null }),
    });
  } catch { /* Provisional attendance must never block video. */ }
}

export function useDailyCall(input: {
  sessionId: string; userId: string; isHost: boolean; sessionEnded: boolean; theme?: DailyThemeConfig | null;
}) {
  const { sessionId, userId, isHost, sessionEnded, theme = null } = input;
  const surface = isHost ? "teacher" : "student";
  const frameRef = useRef<DailyCall | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const joinedRef = useRef(false);
  const connectInFlight = useRef(false);
  const activeRef = useRef(false);
  const stoppedRef = useRef(false);
  const generationRef = useRef(0);
  const resumeRef = useRef<DailyResume | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signalingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const connectRef = useRef<() => Promise<void>>(async () => {});
  const destroyPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const interruptionsRef = useRef(new Set<string>());
  const themeRef = useRef(theme);
  const [phase, setPhase] = useState<DailyCallPhase>("ready");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tokenExp, setTokenExp] = useState<number | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const clearRetry = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);
  const clearSignalingWatchdog = useCallback(() => {
    if (signalingTimerRef.current) clearTimeout(signalingTimerRef.current);
    signalingTimerRef.current = null;
  }, []);
  const forgetResume = useCallback(() => {
    resumeRef.current = null;
    try { sessionStorage.removeItem(dailyResumeKey(sessionId, userId)); } catch { /* Storage unavailable. */ }
  }, [sessionId, userId]);
  const rememberMedia = useCallback((call: DailyCall) => {
    const local = call.participants()?.local;
    if (!local) return;
    resumeRef.current = { joinedAt: Date.now(), audioOff: local.audio !== true, videoOff: local.video !== true };
    try { sessionStorage.setItem(dailyResumeKey(sessionId, userId), JSON.stringify(resumeRef.current)); } catch { /* In-memory recovery still works. */ }
  }, [sessionId, userId]);

  const scheduleRecovery = useCallback(function schedule() {
    if (!activeRef.current || stoppedRef.current || timerRef.current) return;
    if (attemptRef.current >= DAILY_RETRY_DELAYS_MS.length) {
      setReconnecting(false);
      setError("Video could not reconnect yet. Your classroom is still open. Try reconnecting when your connection improves.");
      return;
    }
    setReconnecting(true);
    if (!navigator.onLine) return;
    const delay = DAILY_RETRY_DELAYS_MS[attemptRef.current++];
    const retry = () => {
      timerRef.current = null;
      if (!activeRef.current || stoppedRef.current || !navigator.onLine) return;
      // A failed join may still be releasing its iframe. Serialize recovery.
      if (connectInFlight.current) { timerRef.current = setTimeout(retry, 1000); return; }
      void connectRef.current();
    };
    timerRef.current = setTimeout(retry, delay);
  }, []);

  const destroyCall = useCallback(async (reportLeave: boolean) => {
    clearSignalingWatchdog();
    const call = frameRef.current;
    frameRef.current = null;
    if (joinedRef.current && reportLeave) void postAttendance(sessionId, "leave");
    joinedRef.current = false;
    if (!call) return destroyPromiseRef.current;
    const task = (async () => {
      // destroy also leaves the call. A separate leave can wait indefinitely on
      // broken signaling before we ever release the old iframe.
      try { await call.destroy(); } catch { /* Already destroyed. */ }
    })();
    destroyPromiseRef.current = task;
    await task;
  }, [sessionId, clearSignalingWatchdog]);

  useEffect(() => {
    activeRef.current = true;
    stoppedRef.current = sessionEnded;
    generationRef.current++;
    try { resumeRef.current = parseDailyResume(sessionStorage.getItem(dailyResumeKey(sessionId, userId))); } catch { resumeRef.current = null; }
    const online = () => {
      if (stoppedRef.current) return;
      const state = frameRef.current?.meetingState();
      if ((joinedRef.current && state === "joined-meeting") || (connectInFlight.current && state === "joining-meeting")) return;
      attemptRef.current = 0;
      scheduleRecovery();
    };
    window.addEventListener("online", online);
    return () => {
      activeRef.current = false;
      generationRef.current++;
      clearRetry(); clearSignalingWatchdog();
      window.removeEventListener("online", online);
      // Refresh preserves join intent; explicit leave and session end clear it.
      void destroyCall(true);
    };
    // sessionEnded is handled separately without remounting a working call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId, clearRetry, clearSignalingWatchdog, destroyCall, scheduleRecovery]);

  useEffect(() => {
    if (!sessionEnded) return;
    stoppedRef.current = true;
    generationRef.current++;
    clearRetry(); clearSignalingWatchdog(); forgetResume();
    void destroyCall(true).then(() => { setPhase("ready"); setExpanded(false); setReconnecting(false); });
  }, [sessionEnded, clearRetry, clearSignalingWatchdog, forgetResume, destroyCall]);

  useEffect(() => {
    const change = () => {
      const classroom = containerRef.current?.closest("[data-classroom-shell]");
      setIsFullscreen(Boolean(classroom && document.fullscreenElement === classroom));
    };
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    themeRef.current = theme;
    if (frameRef.current && theme) void frameRef.current.setTheme(theme).catch(() => {});
  }, [theme]);

  const attachHandlers = useCallback((call: DailyCall) => {
    let finishConnection: ReturnType<typeof startAppDiagnosticSpan> | undefined;
    const current = () => activeRef.current && frameRef.current === call;
    call.on("loaded", () => {
      if (current()) recordAppDiagnostic(surface, "virtual-classroom-video", "daily_lobby_ready", { sessionId });
    });
    call.on("joining-meeting", () => {
      if (current()) finishConnection = startAppDiagnosticSpan(surface, "virtual-classroom-video", "daily_connection", { sessionId });
    });
    call.on("joined-meeting", () => {
      if (!current() || stoppedRef.current) return;
      finishConnection?.();
      joinedRef.current = true;
      attemptRef.current = 0;
      clearRetry(); clearSignalingWatchdog(); interruptionsRef.current.clear(); rememberMedia(call);
      setPhase("joined"); setReconnecting(false); setError(null); setErrorCode(null);
      void postAttendance(sessionId, "join", call.participants()?.local?.session_id);
    });
    call.on("participant-updated", event => {
      if (current() && joinedRef.current && event.participant.local) rememberMedia(call);
    });
    call.on("left-meeting", () => {
      if (!current()) return;
      clearSignalingWatchdog();
      if (joinedRef.current) void postAttendance(sessionId, "leave");
      joinedRef.current = false;
      if (!stoppedRef.current) { setPhase("error"); scheduleRecovery(); }
    });
    call.on("error", event => {
      if (!current()) return;
      finishConnection?.(undefined, new Error("Daily connection failed"));
      const type = event.error?.type as string | undefined;
      recordAppDiagnostic(surface, "virtual-classroom-video", "daily_fatal_error", { sessionId, errorType: type });
      setError(event.errorMsg || "Video call error."); setErrorCode(type ?? "daily_error"); setPhase("error");
      clearSignalingWatchdog();
      if (canRecoverDailyFatalError(type)) { joinedRef.current = false; scheduleRecovery(); }
      else { stoppedRef.current = true; clearRetry(); forgetResume(); setReconnecting(false); }
    });
    call.on("network-connection", event => {
      if (!current()) return;
      recordAppDiagnostic(surface, "virtual-classroom-video", "daily_network_connection", { sessionId, connectionType: event.type, connectionEvent: event.event });
      if (event.event === "interrupted") interruptionsRef.current.add(event.type);
      if (event.event === "connected") interruptionsRef.current.delete(event.type);
      if (event.type === "signaling") {
        if (event.event === "connected") clearSignalingWatchdog();
        if (event.event === "interrupted" && joinedRef.current && !signalingTimerRef.current) {
          signalingTimerRef.current = setTimeout(() => {
            signalingTimerRef.current = null;
            if (!current() || stoppedRef.current || !joinedRef.current || !interruptionsRef.current.has("signaling")) return;
            // Some interrupted calls remain "joined" without a fatal error.
            // Once the provider's repair grace has passed, authorize fresh entry.
            rememberMedia(call);
            recordAppDiagnostic(surface, "virtual-classroom-video", "daily_signaling_recovery", { sessionId });
            joinedRef.current = false;
            setPhase("error"); scheduleRecovery();
          }, SIGNALING_RECOVERY_GRACE_MS);
        }
      }
      // Keep the iframe alive. Daily repairs brief interruptions itself.
      if (joinedRef.current) setReconnecting(interruptionsRef.current.size > 0);
    });
    call.on("network-quality-change", event => {
      if (current()) recordAppDiagnostic(surface, "virtual-classroom-video", "daily_network_quality", { sessionId, networkState: event.networkState });
    });
    call.on("cpu-load-change", event => {
      if (current()) recordAppDiagnostic(surface, "virtual-classroom-video", "daily_cpu_load", { sessionId, cpuLoadState: event.cpuLoadState, reason: event.cpuLoadStateReason });
    });
  }, [surface, sessionId, rememberMedia, forgetResume, clearRetry, clearSignalingWatchdog, scheduleRecovery]);

  const connect = useCallback(async () => {
    if (!activeRef.current || sessionEnded || connectInFlight.current || joinedRef.current) return;
    connectInFlight.current = true;
    clearRetry();
    const generation = generationRef.current;
    const current = () => activeRef.current && generationRef.current === generation && !stoppedRef.current;
    setPhase("connecting"); setExpanded(true); setError(null); setErrorCode(null);
    try {
      if (!navigator.onLine) { setPhase("error"); scheduleRecovery(); return; }
      const response = await diagnosticFetch(`/api/virtual-classroom/${sessionId}/daily/token`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resumeRef.current ? { resume: true, audioOff: resumeRef.current.audioOff, videoOff: resumeRef.current.videoOff } : {}),
        signal: AbortSignal.timeout(20_000),
      }, { surface, phase: "virtual-classroom-video", name: "daily_token", detail: { sessionId, recovering: Boolean(resumeRef.current) } });
      const payload = await response.json().catch(() => ({})) as TokenResponse;
      if (!current()) return;
      if (!response.ok || !payload.token || !payload.roomUrl) {
        setError(payload.error ?? "Could not connect video."); setErrorCode(payload.code ?? "token_failed");
        setPhase(payload.code === "daily_disabled" ? "disabled" : "error");
        if (canRetryDailyRequest(response.status, payload.code)) scheduleRecovery();
        else { stoppedRef.current = true; setReconnecting(false); forgetResume(); await destroyCall(false); }
        return;
      }
      // A fatal SDK failure needs a fresh frame; brief interruptions do not.
      await destroyCall(false);
      if (!current()) return;
      const finishSdk = startAppDiagnosticSpan(surface, "virtual-classroom-video", "daily_sdk_load", { sessionId });
      let Daily;
      try { Daily = (await import("@daily-co/daily-js")).default; finishSdk(); }
      catch (err) { finishSdk(undefined, err); throw err; }
      if (!current() || !containerRef.current) return;
      const call = Daily.createFrame(containerRef.current, {
        iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "0" },
        showLeaveButton: false, showFullscreenButton: false,
        ...(themeRef.current ? { theme: themeRef.current } : {}),
      });
      frameRef.current = call; attachHandlers(call);
      interruptionsRef.current.clear();
      setTokenExp(payload.exp ?? null); setPhase("prejoin");
      const finishJoin = startAppDiagnosticSpan(surface, "virtual-classroom-video", "daily_join", { sessionId });
      try { await call.join({ url: payload.roomUrl, token: payload.token }); finishJoin(); }
      catch (err) { finishJoin(undefined, err); throw err; }
      // Token expiry gates future entry. Do not leave a live call to refresh it.
      // Each actual recovery obtains a freshly authorized token above.
    } catch (err) {
      if (!current()) return;
      setError(err instanceof Error ? err.message : "Could not connect video.");
      setErrorCode("connect_failed"); setPhase("error");
      await destroyCall(false);
      if (current()) scheduleRecovery();
    } finally {
      connectInFlight.current = false;
      // StrictMode or a genuine remount can invalidate an in-flight bootstrap.
      if (activeRef.current && generationRef.current !== generation && !stoppedRef.current) scheduleRecovery();
    }
  }, [sessionEnded, clearRetry, sessionId, surface, destroyCall, attachHandlers, scheduleRecovery, forgetResume]);
  useEffect(() => { connectRef.current = connect; }, [connect]);

  const requestConnect = useCallback(async () => {
    if (sessionEnded) return;
    stoppedRef.current = false; attemptRef.current = 0; await connect();
  }, [connect, sessionEnded]);
  const cancelRecovery = useCallback(() => {
    stoppedRef.current = true; generationRef.current++; clearRetry(); clearSignalingWatchdog(); forgetResume(); setReconnecting(false);
    void destroyCall(true).then(() => setPhase("ready"));
  }, [clearRetry, clearSignalingWatchdog, forgetResume, destroyCall]);
  const requestFullscreen = useCallback(async () => {
    const root = containerRef.current?.closest<HTMLElement>("[data-classroom-shell]");
    if (!root?.requestFullscreen) return false;
    try { await root.requestFullscreen(); return true; } catch { return false; }
  }, []);
  const exitFullscreen = useCallback(() => {
    const root = containerRef.current?.closest("[data-classroom-shell]");
    if (root && document.fullscreenElement === root) void document.exitFullscreen().catch(() => {});
  }, []);
  const leave = useCallback(async () => {
    exitFullscreen(); cancelRecovery(); setExpanded(false); setError(null); setErrorCode(null);
  }, [exitFullscreen, cancelRecovery]);

  return {
    phase, error, errorCode, expanded, setExpanded, isFullscreen, containerRef,
    connect: requestConnect, leave, requestFullscreen, exitFullscreen,
    retryProbe: requestConnect, tokenExp, reconnecting, cancelRecovery,
    themeKey: theme ? dailyThemeColorsKey(theme) : "",
  };
}
