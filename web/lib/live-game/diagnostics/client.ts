"use client";

import type {
  LiveGameDiagnosticDetail,
  LiveGameDiagnosticEvent,
  LiveGameDiagnosticPhase,
} from "@/lib/live-game/diagnostics/types";

const EVENTS_KEY = "wke:live-game:diagnostic-events:v1";
const TRACE_KEY = "wke:live-game:diagnostic-trace:v1";
const DEVICE_KEY = "wke:live-game:diagnostic-device:v1";
const CHANGE_EVENT = "wke-live-game-diagnostics-change";
const MAX_EVENTS = 1_000;

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function liveGameDiagnosticsEnabled() {
  return process.env.NEXT_PUBLIC_LIVE_GAME_DIAGNOSTICS !== "0";
}

export function liveGameDiagnosticPanelEnabled() {
  return process.env.NODE_ENV !== "production" && liveGameDiagnosticsEnabled();
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Diagnostics must never interrupt the game.
  }
}

export function getLiveGameDiagnosticTraceId() {
  if (typeof window === "undefined") return "server";
  let traceId = window.sessionStorage.getItem(TRACE_KEY);
  if (!traceId) {
    traceId = randomId("journey");
    window.sessionStorage.setItem(TRACE_KEY, traceId);
  }
  return traceId;
}

function getDeviceId() {
  if (typeof window === "undefined") return "server";
  let deviceId = window.localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = randomId("device");
    window.localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
}

export function beginLiveGameDiagnosticJourney(source: string) {
  if (!liveGameDiagnosticsEnabled() || typeof window === "undefined") return;
  window.sessionStorage.setItem(TRACE_KEY, randomId("journey"));
  writeStorage(EVENTS_KEY, []);
  recordLiveGameDiagnostic("entry", "teacher_dashboard_click", { source });
}

export function readLiveGameDiagnosticEvents() {
  return readStorage<LiveGameDiagnosticEvent[]>(EVENTS_KEY, []);
}

export function clearLiveGameDiagnosticEvents() {
  writeStorage(EVENTS_KEY, []);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function recordLiveGameDiagnostic(
  phase: LiveGameDiagnosticPhase,
  name: string,
  detail?: LiveGameDiagnosticDetail,
  options?: {
    kind?: LiveGameDiagnosticEvent["kind"];
    durationMs?: number;
    roomId?: string;
    role?: "host" | "player";
    displayName?: string;
  },
) {
  if (!liveGameDiagnosticsEnabled() || typeof window === "undefined") return null;
  const event: LiveGameDiagnosticEvent = {
    id: randomId("event"),
    traceId: getLiveGameDiagnosticTraceId(),
    deviceId: getDeviceId(),
    at: Date.now(),
    phase,
    name,
    kind: options?.kind ?? "mark",
    durationMs: options?.durationMs,
    roomId: options?.roomId,
    role: options?.role,
    displayName: options?.displayName,
    detail,
  };
  const events = [...readLiveGameDiagnosticEvents(), event].slice(-MAX_EVENTS);
  writeStorage(EVENTS_KEY, events);
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return event;
}

export function startLiveGameDiagnosticSpan(
  phase: LiveGameDiagnosticPhase,
  name: string,
  detail?: LiveGameDiagnosticDetail,
) {
  const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
  recordLiveGameDiagnostic(phase, `${name}_start`, detail);
  let ended = false;
  return (endDetail?: LiveGameDiagnosticDetail, error?: unknown) => {
    if (ended) return;
    ended = true;
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    recordLiveGameDiagnostic(
      phase,
      name,
      { ...detail, ...endDetail, ...(error ? { error: error instanceof Error ? error.message : String(error) } : {}) },
      { kind: error ? "error" : "span", durationMs: Math.max(0, now - startedAt) },
    );
  };
}

function parseServerTiming(value: string | null) {
  if (!value) return [] as Array<{ name: string; durationMs: number }>;
  return value.split(",").map((part) => {
    const [rawName, ...params] = part.trim().split(";");
    const duration = params.find((param) => param.trim().startsWith("dur="));
    return { name: rawName.trim(), durationMs: Number(duration?.trim().slice(4) ?? 0) };
  }).filter((metric) => metric.name && Number.isFinite(metric.durationMs));
}

export async function diagnosticFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: { phase: LiveGameDiagnosticPhase; name: string; detail?: LiveGameDiagnosticDetail },
) {
  if (!liveGameDiagnosticsEnabled()) return fetch(input, init);
  const finish = startLiveGameDiagnosticSpan(options.phase, options.name, options.detail);
  const startedAt = performance.now();
  try {
    const response = await fetch(input, init);
    const headersAt = performance.now();
    const metrics = parseServerTiming(response.headers.get("Server-Timing"));
    for (const metric of metrics) {
      recordLiveGameDiagnostic(options.phase, `server:${metric.name}`, options.detail, {
        kind: "span",
        durationMs: metric.durationMs,
      });
    }
    finish({
      status: response.status,
      ok: response.ok,
      timeToHeadersMs: Math.round(headersAt - startedAt),
      serverMs: Math.round(metrics.reduce((max, metric) => Math.max(max, metric.durationMs), 0)),
    });
    return response;
  } catch (error) {
    const aborted = init?.signal != null && "aborted" in init.signal && init.signal.aborted;
    if (aborted || (error instanceof DOMException && error.name === "AbortError")) {
      finish({ cancelled: true });
    } else {
      finish(undefined, error);
    }
    throw error;
  }
}

export function subscribeToLiveGameDiagnostics(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
