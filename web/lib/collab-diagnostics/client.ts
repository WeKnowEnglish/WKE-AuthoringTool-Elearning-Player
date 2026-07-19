"use client";

import { resolveServerMs } from "@/lib/live-game/diagnostics/server-timing-parse";
import type {
  CollabDiagDetail,
  CollabDiagEvent,
  CollabDiagPhase,
} from "@/lib/collab-diagnostics/types";

const EVENTS_KEY = "wke:collab:diagnostic-events:v1";
const TRACE_KEY = "wke:collab:diagnostic-trace:v1";
const CHANGE_EVENT = "wke-collab-diagnostics-change";
const MAX_EVENTS = 300;

function randomId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function collabDiagnosticsEnabled() {
  return process.env.NEXT_PUBLIC_COLLAB_DIAGNOSTICS !== "0";
}

/** Orange live panel — host/dev surfaces only; never shown to students. */
export function collabDiagnosticPanelEnabled() {
  return process.env.NODE_ENV !== "production" && collabDiagnosticsEnabled();
}

/** Download JSON after a session — available in staging/prod for teachers. */
export function collabDiagnosticExportEnabled() {
  return collabDiagnosticsEnabled();
}

export function exportCollabDiagnosticEvents(
  filenamePrefix = "collab-diagnostics",
): boolean {
  if (typeof window === "undefined" || !collabDiagnosticsEnabled()) return false;
  const events = readCollabDiagnosticEvents();
  if (events.length === 0) return false;
  const payload = JSON.stringify(events, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}-${new Date().toISOString().replaceAll(":", "-")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
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
    // Diagnostics must never interrupt the activity.
  }
}

export function getCollabDiagnosticTraceId() {
  if (typeof window === "undefined") return "server";
  let traceId = window.sessionStorage.getItem(TRACE_KEY);
  if (!traceId) {
    traceId = randomId("journey");
    window.sessionStorage.setItem(TRACE_KEY, traceId);
  }
  return traceId;
}

export function readCollabDiagnosticEvents() {
  return readStorage<CollabDiagEvent[]>(EVENTS_KEY, []);
}

export function clearCollabDiagnosticEvents() {
  writeStorage(EVENTS_KEY, []);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function recordCollabDiagnostic(
  phase: CollabDiagPhase,
  name: string,
  detail?: CollabDiagDetail,
  options?: {
    kind?: CollabDiagEvent["kind"];
    durationMs?: number;
  },
) {
  if (!collabDiagnosticsEnabled() || typeof window === "undefined") return null;
  const event: CollabDiagEvent = {
    id: randomId("event"),
    traceId: getCollabDiagnosticTraceId(),
    at: Date.now(),
    phase,
    name,
    kind: options?.kind ?? "mark",
    durationMs: options?.durationMs,
    detail,
  };
  const events = [...readCollabDiagnosticEvents(), event].slice(-MAX_EVENTS);
  writeStorage(EVENTS_KEY, events);
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return event;
}

export function startCollabDiagnosticSpan(
  phase: CollabDiagPhase,
  name: string,
  detail?: CollabDiagDetail,
) {
  const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
  recordCollabDiagnostic(phase, `${name}_start`, detail);
  let ended = false;
  return (endDetail?: CollabDiagDetail, error?: unknown) => {
    if (ended) return;
    ended = true;
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    recordCollabDiagnostic(
      phase,
      name,
      {
        ...detail,
        ...endDetail,
        ...(error
          ? { error: error instanceof Error ? error.message : String(error) }
          : {}),
      },
      { kind: error ? "error" : "span", durationMs: Math.max(0, now - startedAt) },
    );
  };
}

export async function diagnosticFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: { phase: CollabDiagPhase; name: string; detail?: CollabDiagDetail },
) {
  if (!collabDiagnosticsEnabled()) return fetch(input, init);
  const finish = startCollabDiagnosticSpan(options.phase, options.name, options.detail);
  const startedAt = performance.now();
  try {
    const response = await fetch(input, init);
    const timeToHeadersMs = Math.round(performance.now() - startedAt);
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
      // Malformed timing headers must never break activity requests.
    }
    for (const metric of metrics) {
      if (metric.name === "total" || metric.name === options.name.replace(/\./g, "_")) continue;
      recordCollabDiagnostic(options.phase, `server:${metric.name}`, options.detail, {
        kind: "span",
        durationMs: Math.round(metric.durationMs),
      });
    }
    const roundedServerMs = serverMs == null ? null : Math.round(serverMs);
    finish({
      status: response.status,
      ok: response.ok,
      timeToHeadersMs,
      serverMs: roundedServerMs,
      networkOrQueueMs:
        roundedServerMs == null ? null : Math.max(0, timeToHeadersMs - roundedServerMs),
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

export function subscribeToCollabDiagnostics(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
