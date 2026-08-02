"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearAppDiagnosticEvents,
  exportAppDiagnosticsAsCsv,
  exportAppDiagnosticsAsJson,
  readAppDiagnosticEvents,
  subscribeToAppDiagnostics,
} from "@/lib/app-diagnostics/client";
import type { AppDiagnosticEvent, AppDiagnosticKind, AppDiagnosticSurface } from "@/lib/app-diagnostics/types";
import type { CentralDiagnosticEvent } from "@/lib/data/admin-diagnostics";

type SurfaceFilter = AppDiagnosticSurface | "all";
type KindFilter = AppDiagnosticKind | "all";

function formatDuration(durationMs?: number | null) {
  if (durationMs == null) return "—";
  return durationMs < 1000 ? `${Math.round(durationMs)} ms` : `${(durationMs / 1000).toFixed(2)} s`;
}

function durationColor(durationMs?: number | null) {
  if (durationMs == null) return "text-neutral-400";
  if (durationMs < 250) return "text-emerald-600";
  if (durationMs < 1000) return "text-amber-600";
  return "text-red-600";
}

const SURFACES: Array<{ key: SurfaceFilter; label: string }> = [
  { key: "all", label: "All surfaces" },
  { key: "student", label: "Student" },
  { key: "teacher", label: "Teacher" },
  { key: "lesson", label: "Lesson" },
  { key: "live-game", label: "Live game" },
  { key: "admin", label: "Admin" },
];

const KINDS: Array<{ key: KindFilter; label: string }> = [
  { key: "all", label: "All kinds" },
  { key: "error", label: "Errors" },
  { key: "span", label: "Timings" },
  { key: "vital", label: "Vitals" },
  { key: "mark", label: "Actions" },
];

export function DiagnosticsAdminPanel({
  centralEvents,
  centralError,
}: {
  centralEvents: CentralDiagnosticEvent[];
  centralError: string | null;
}) {
  const [localEvents, setLocalEvents] = useState<AppDiagnosticEvent[]>([]);
  const [surface, setSurface] = useState<SurfaceFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refresh = () => setLocalEvents(readAppDiagnosticEvents());
    const timer = window.setTimeout(refresh, 0);
    const unsubscribe = subscribeToAppDiagnostics(refresh);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return centralEvents.filter((event) => {
      if (surface !== "all" && event.surface !== surface) return false;
      if (kind !== "all" && event.kind !== kind) return false;
      if (!needle) return true;
      return [event.userLabel, event.name, event.phase, event.route, event.activityId, event.errorCode]
        .some((value) => value?.toLowerCase().includes(needle));
    });
  }, [centralEvents, kind, query, surface]);

  const uniqueUsers = new Set(centralEvents.map((event) => event.userLabel)).size;
  const uniqueSessions = new Set(centralEvents.map((event) => event.sessionId)).size;
  const errors = centralEvents.filter((event) => event.kind === "error").length;
  const durations = centralEvents
    .map((event) => event.durationMs)
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  const p95 = durations.length > 0 ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))] : null;

  return (
    <div className="space-y-6">
      {centralError ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="status">
          {centralError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Events (24h)", centralEvents.length],
          ["Users", uniqueUsers],
          ["Sessions", uniqueSessions],
          ["Errors", errors],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${label === "Errors" && Number(value) > 0 ? "text-red-600" : "text-neutral-900"}`}>{value}</p>
          </div>
        ))}
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">P95 timing</p>
          <p className={`mt-2 text-3xl font-bold ${durationColor(p95)}`}>{formatDuration(p95)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Student, event, activity, route, error…"
          className="min-w-[240px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        {SURFACES.map((item) => (
          <button key={item.key} type="button" onClick={() => setSurface(item.key)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${surface === item.key ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white text-neutral-700"}`}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((item) => (
          <button key={item.key} type="button" onClick={() => setKind(item.key)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${kind === item.key ? "bg-cyan-700 text-white" : "border border-neutral-300 bg-white text-neutral-700"}`}>
            {item.label}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="font-bold text-neutral-900">Cross-device timeline</h2>
          <p className="text-xs text-neutral-500">Newest first · query strings and sensitive metadata are removed before storage.</p>
        </div>
        <div className="max-h-[62vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-500">No matching central events yet.</p>
          ) : filtered.map((event) => (
            <details key={event.id} className="border-b border-neutral-100 px-4 py-3 last:border-0">
              <summary className="grid cursor-pointer gap-2 text-sm sm:grid-cols-[9rem_7rem_1fr_auto] sm:items-center">
                <span className="truncate font-semibold text-neutral-800">{event.userLabel}</span>
                <span className="font-mono text-[11px] uppercase text-neutral-500">{event.role} · {event.deviceCategory ?? "unknown"}</span>
                <span className={event.kind === "error" ? "font-semibold text-red-700" : "text-neutral-900"}>{event.phase} · {event.name}</span>
                <span className={`font-mono text-xs ${durationColor(event.durationMs)}`}>{formatDuration(event.durationMs)}</span>
              </summary>
              <div className="mt-2 grid gap-1 rounded-lg bg-neutral-50 p-3 font-mono text-xs text-neutral-600 sm:grid-cols-2">
                <p>{new Date(event.occurredAt).toLocaleString()}</p>
                <p>session: {event.sessionId}</p>
                {event.route ? <p>route: {event.route}</p> : null}
                {event.activityId ? <p>activity: {event.activityId}</p> : null}
                {event.status ? <p>status: {event.status}</p> : null}
                {event.errorCode ? <p className="text-red-700">error: {event.errorCode}</p> : null}
                <pre className="col-span-full mt-1 whitespace-pre-wrap break-words">{JSON.stringify(event.metadata, null, 2)}</pre>
              </div>
            </details>
          ))}
        </div>
      </section>

      <details className="rounded-xl border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer font-bold text-neutral-900">This browser’s local diagnostic buffer ({localEvents.length})</summary>
        <p className="mt-2 text-sm text-neutral-600">Use this export when investigating details that are intentionally not uploaded centrally.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => exportAppDiagnosticsAsJson()} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">Download JSON</button>
          <button type="button" onClick={() => exportAppDiagnosticsAsCsv()} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">Download CSV</button>
          <button type="button" onClick={() => clearAppDiagnosticEvents()} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">Clear local buffer</button>
        </div>
      </details>
    </div>
  );
}
