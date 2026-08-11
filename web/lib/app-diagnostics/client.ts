"use client";

import { resolveServerMs } from "@/lib/live-game/diagnostics/server-timing-parse";
import type {
  AppDiagnosticDetail,
  AppDiagnosticEvent,
  AppDiagnosticFetchOptions,
  AppDiagnosticRecordOptions,
  AppDiagnosticSurface,
} from "@/lib/app-diagnostics/types";

const EVENTS_KEY = "wke:app-diagnostics:v1";
const SESSION_KEY = "wke:app-diagnostics:session:v1";
const DEVICE_KEY = "wke:app-diagnostics:device:v1";
const QUEUE_KEY = "wke:app-diagnostics:queue:v1";
const CHANGE_EVENT = "wke-app-diagnostics-change";
const MAX_EVENTS = 2_000;
const MAX_QUEUED_EVENTS = 500;
const BATCH_SIZE = 50;
let flushTimer: number | null = null;
let flushPromise: Promise<number> | null = null;

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function appDiagnosticsEnabled() {
  return process.env.NEXT_PUBLIC_APP_DIAGNOSTICS !== "0";
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
    // Diagnostics must never interrupt the app.
  }
}

function readQueuedEvents() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as AppDiagnosticEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueuedEvents(events: AppDiagnosticEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUED_EVENTS)));
  } catch {
    // Diagnostics must never interrupt the app.
  }
}

function deviceCategory(): AppDiagnosticEvent["deviceCategory"] {
  if (typeof window === "undefined") return "unknown";
  const width = Math.min(window.innerWidth, window.screen?.width || window.innerWidth);
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function scheduleDiagnosticFlush() {
  if (typeof window === "undefined" || flushTimer != null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushAppDiagnosticQueue();
  }, 1_000);
}

export async function flushAppDiagnosticQueue(): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    const queued = readQueuedEvents();
    const firstClassroomSessionId = queued[0]?.classroomSessionId ?? null;
    // A browser can retain events from several classes. Send one classroom at
    // a time so each batch can be authorized by its own session cookie.
    const batch = queued
      .filter((event) => (event.classroomSessionId ?? null) === firstClassroomSessionId)
      .slice(0, BATCH_SIZE);
    if (batch.length === 0) return 0;
    try {
      const response = await fetch("/api/diagnostics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify({ events: batch }),
      });
      if (!response.ok) return 0;
      const payload = (await response.json()) as { accepted?: string[] };
      const accepted = new Set(payload.accepted ?? batch.map((event) => event.id));
      const remaining = readQueuedEvents().filter((event) => !accepted.has(event.id));
      writeQueuedEvents(remaining);
      if (remaining.length > 0) scheduleDiagnosticFlush();
      return accepted.size;
    } catch {
      return 0;
    }
  })().finally(() => {
    flushPromise = null;
  });
  return flushPromise;
}

export function getAppDiagnosticSessionId() {
  if (typeof window === "undefined") return "server";
  let sessionId = window.sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = randomId("session");
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
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

function currentRoute() {
  if (typeof window === "undefined") return undefined;
  return window.location.pathname + window.location.search;
}

function notifyAppDiagnosticsChanged() {
  if (typeof window === "undefined") return;
  // Defer so subscribers (React setState) never run inside useInsertionEffect /
  // history.replaceState patches from the App Router.
  window.setTimeout(() => {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, 0);
}

export function readAppDiagnosticEvents() {
  return readStorage<AppDiagnosticEvent[]>(EVENTS_KEY, []);
}

export function clearAppDiagnosticEvents() {
  writeStorage(EVENTS_KEY, []);
  notifyAppDiagnosticsChanged();
}

export function recordAppDiagnostic(
  surface: AppDiagnosticSurface,
  phase: string,
  name: string,
  detail?: AppDiagnosticDetail,
  options?: AppDiagnosticRecordOptions,
) {
  if (!appDiagnosticsEnabled() || typeof window === "undefined") return null;
  const route = options?.route ?? currentRoute();
  const classroomSessionId =
    options?.classroomSessionId ??
    (route ?? "").match(/^\/(?:teacher\/)?virtual-classroom\/(vcs_[A-Za-z0-9_-]+)/)?.[1];
  const event: AppDiagnosticEvent = {
    id: randomId("event"),
    sessionId: getAppDiagnosticSessionId(),
    deviceId: getDeviceId(),
    at: Date.now(),
    surface,
    phase,
    name,
    kind: options?.kind ?? "mark",
    durationMs: options?.durationMs,
    route,
    detail,
    classId: options?.classId,
    classroomSessionId,
    activityId: options?.activityId,
    homeworkId: options?.homeworkId,
    status: options?.status,
    errorCode: options?.errorCode,
    appVersion: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "development",
    deviceCategory: deviceCategory(),
  };
  const events = [...readAppDiagnosticEvents(), event].slice(-MAX_EVENTS);
  writeStorage(EVENTS_KEY, events);
  writeQueuedEvents([...readQueuedEvents(), event]);
  scheduleDiagnosticFlush();
  notifyAppDiagnosticsChanged();
  return event;
}

export function startAppDiagnosticSpan(
  surface: AppDiagnosticSurface,
  phase: string,
  name: string,
  detail?: AppDiagnosticDetail,
) {
  const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
  recordAppDiagnostic(surface, phase, `${name}_start`, detail);
  let ended = false;
  return (endDetail?: AppDiagnosticDetail, error?: unknown) => {
    if (ended) return;
    ended = true;
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    recordAppDiagnostic(
      surface,
      phase,
      name,
      {
        ...detail,
        ...endDetail,
        ...(error ? { error: error instanceof Error ? error.message : String(error) } : {}),
      },
      {
        kind: error ? "error" : "span",
        durationMs: Math.max(0, now - startedAt),
      },
    );
  };
}

export type InstrumentedFetchResult = {
  response: Response;
  timeToHeadersMs: number;
  serverMs: number | null;
  metrics: Array<{ name: string; durationMs: number }>;
};

export async function instrumentedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<InstrumentedFetchResult> {
  const startedAt = performance.now();
  const response = await fetch(input, init);
  const headersAt = performance.now();
  const timeToHeadersMs = Math.round(headersAt - startedAt);
  let serverMs: number | null = null;
  let metrics: Array<{ name: string; durationMs: number }> = [];
  try {
    const resolved = resolveServerMs(
      response.headers.get("X-Server-Ms"),
      response.headers.get("Server-Timing"),
    );
    serverMs = resolved.serverMs;
    metrics = resolved.metrics;
  } catch {
    // Malformed timing headers must never break requests.
  }
  return { response, timeToHeadersMs, serverMs, metrics };
}

export async function diagnosticFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: AppDiagnosticFetchOptions,
) {
  if (!appDiagnosticsEnabled()) return fetch(input, init);
  const finish = startAppDiagnosticSpan(options.surface, options.phase, options.name, options.detail);
  try {
    const { response, timeToHeadersMs, serverMs, metrics } = await instrumentedFetch(input, init);
    for (const metric of metrics) {
      recordAppDiagnostic(options.surface, options.phase, `server:${metric.name}`, options.detail, {
        kind: "span",
        durationMs: metric.durationMs,
      });
    }
    const roundedServerMs = serverMs == null ? null : Math.round(serverMs);
    const vercelRequestId = response.headers.get("x-vercel-id");
    const serverRegion = vercelRequestId?.split("::")[0]?.trim() || null;
    finish({
      status: response.status,
      ok: response.ok,
      timeToHeadersMs,
      serverMs: roundedServerMs,
      networkOrQueueMs:
        roundedServerMs == null ? null : Math.max(0, timeToHeadersMs - roundedServerMs),
      serverRegion,
      serverTiming:
        metrics.length > 0
          ? metrics.map((metric) => ({
              name: metric.name,
              durationMs: Math.round(metric.durationMs * 10) / 10,
            }))
          : null,
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

export function subscribeToAppDiagnostics(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function timestampForFilename() {
  return new Date().toISOString().replaceAll(":", "-");
}

export function exportAppDiagnosticsAsJson(filenamePrefix = "app-diagnostics") {
  const events = readAppDiagnosticEvents();
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      sessionId: getAppDiagnosticSessionId(),
      deviceId: typeof window !== "undefined" ? getDeviceId() : "server",
      eventCount: events.length,
      events,
    },
    null,
    2,
  );
  downloadBlob(
    `${filenamePrefix}-${timestampForFilename()}.json`,
    new Blob([payload], { type: "application/json" }),
  );
  return events.length;
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function exportAppDiagnosticsAsCsv(filenamePrefix = "app-diagnostics") {
  const events = readAppDiagnosticEvents();
  const headers = [
    "id",
    "at",
    "sessionId",
    "deviceId",
    "surface",
    "phase",
    "name",
    "kind",
    "durationMs",
    "route",
    "detail",
  ];
  const rows = events.map((event) =>
    [
      event.id,
      String(event.at),
      event.sessionId,
      event.deviceId,
      event.surface,
      event.phase,
      event.name,
      event.kind,
      event.durationMs == null ? "" : String(event.durationMs),
      event.route ?? "",
      event.detail ? JSON.stringify(event.detail) : "",
    ]
      .map((cell) => csvEscape(String(cell)))
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  downloadBlob(
    `${filenamePrefix}-${timestampForFilename()}.csv`,
    new Blob([csv], { type: "text/csv" }),
  );
  return events.length;
}
