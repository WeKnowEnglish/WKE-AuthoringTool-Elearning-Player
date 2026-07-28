"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearAppDiagnosticEvents,
  exportAppDiagnosticsAsCsv,
  exportAppDiagnosticsAsJson,
  readAppDiagnosticEvents,
  subscribeToAppDiagnostics,
} from "@/lib/app-diagnostics/client";
import type {
  AppDiagnosticEvent,
  AppDiagnosticKind,
  AppDiagnosticSurface,
} from "@/lib/app-diagnostics/types";

type SurfaceFilter = AppDiagnosticSurface | "all";
type KindFilter = AppDiagnosticKind | "all";

function formatDuration(durationMs?: number) {
  if (durationMs == null) return "—";
  return durationMs < 1000 ? `${Math.round(durationMs)} ms` : `${(durationMs / 1000).toFixed(2)} s`;
}

function durationColor(durationMs?: number) {
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
  { key: "vital", label: "Vitals" },
  { key: "span", label: "Spans" },
  { key: "mark", label: "Marks" },
  { key: "error", label: "Errors" },
];

export function DiagnosticsAdminPanel() {
  const [events, setEvents] = useState<AppDiagnosticEvent[]>([]);
  const [surface, setSurface] = useState<SurfaceFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const refresh = () => setEvents(readAppDiagnosticEvents());
    refresh();
    return subscribeToAppDiagnostics(refresh);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events
      .filter((event) => (surface === "all" ? true : event.surface === surface))
      .filter((event) => (kind === "all" ? true : event.kind === kind))
      .filter((event) => {
        if (!needle) return true;
        return (
          event.name.toLowerCase().includes(needle) ||
          event.phase.toLowerCase().includes(needle) ||
          (event.route ?? "").toLowerCase().includes(needle)
        );
      })
      .slice()
      .reverse();
  }, [events, kind, query, surface]);

  const errors = events.filter((event) => event.kind === "error").length;
  const lcp = [...events].reverse().find((event) => event.name === "LCP");
  const slowestFetch = events
    .filter((event) => event.phase === "fetch" && event.kind === "span" && event.durationMs != null)
    .reduce<AppDiagnosticEvent | null>((slowest, event) => {
      if (!slowest || (event.durationMs ?? 0) > (slowest.durationMs ?? 0)) return event;
      return slowest;
    }, null);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Events</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{events.length}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Errors</p>
          <p className={`mt-2 text-3xl font-bold ${errors ? "text-red-600" : "text-emerald-600"}`}>
            {errors}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Latest LCP</p>
          <p className={`mt-2 text-3xl font-bold ${durationColor(lcp?.durationMs)}`}>
            {formatDuration(lcp?.durationMs)}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Slowest fetch
          </p>
          <p className={`mt-2 text-2xl font-bold ${durationColor(slowestFetch?.durationMs)}`}>
            {slowestFetch ? formatDuration(slowestFetch.durationMs) : "—"}
          </p>
          {slowestFetch ? (
            <p className="mt-1 truncate text-xs text-neutral-500">{slowestFetch.name}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => exportAppDiagnosticsAsJson()}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Download JSON
        </button>
        <button
          type="button"
          onClick={() => exportAppDiagnosticsAsCsv()}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Download CSV
        </button>
        <button
          type="button"
          onClick={() => clearAppDiagnosticEvents()}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Clear session
        </button>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name, phase, route…"
          className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SURFACES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSurface(item.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              surface === item.key
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setKind(item.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              kind === item.key
                ? "bg-cyan-700 text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="max-h-[60vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-500">
              No diagnostic events yet. Browse the site in this tab, then return here to export.
            </p>
          ) : (
            filtered.map((event) => (
              <details
                key={event.id}
                className="border-b border-neutral-100 px-4 py-3 last:border-b-0"
              >
                <summary className="grid cursor-pointer grid-cols-[88px_88px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-mono text-xs uppercase text-neutral-500">
                    {event.surface}
                  </span>
                  <span className="font-mono text-xs uppercase text-neutral-500">{event.kind}</span>
                  <span
                    className={
                      event.kind === "error" ? "font-semibold text-red-700" : "text-neutral-900"
                    }
                  >
                    {event.phase} · {event.name}
                  </span>
                  <span className={`font-mono text-xs ${durationColor(event.durationMs)}`}>
                    {formatDuration(event.durationMs)}
                  </span>
                </summary>
                <div className="mt-2 space-y-1 rounded-lg bg-neutral-50 p-3 font-mono text-xs text-neutral-600">
                  <p>{new Date(event.at).toLocaleString()}</p>
                  {event.route ? <p>route: {event.route}</p> : null}
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(event.detail ?? {}, null, 2)}
                  </pre>
                </div>
              </details>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
