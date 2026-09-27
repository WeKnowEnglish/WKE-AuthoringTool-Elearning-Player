"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearAppDiagnosticEvents,
  exportAppDiagnosticsAsCsv,
  exportAppDiagnosticsAsJson,
  readAppDiagnosticEvents,
  subscribeToAppDiagnostics,
} from "@/lib/app-diagnostics/client";
import {
  diagnosticIssueFingerprint,
  PLATFORM_HEALTH_JOURNEYS,
  PLATFORM_HEALTH_WINDOWS,
  type PlatformHealthJourneyId,
  type PlatformHealthSnapshot,
  type PlatformHealthStatus,
  type PlatformIssueSeverity,
} from "@/lib/app-diagnostics/platform-health";
import type { AppDiagnosticEvent, AppDiagnosticKind, AppDiagnosticSurface } from "@/lib/app-diagnostics/types";
import type { CentralDiagnosticEvent } from "@/lib/data/admin-diagnostics";

type SurfaceFilter = AppDiagnosticSurface | "all";
type KindFilter = AppDiagnosticKind | "all";
type JourneyFilter = PlatformHealthJourneyId | "all";
type SeverityFilter = PlatformIssueSeverity | "all";

function formatDuration(durationMs?: number | null) {
  if (durationMs == null) return "—";
  return durationMs < 1000 ? `${Math.round(durationMs)} ms` : `${(durationMs / 1000).toFixed(2)} s`;
}

function durationColor(durationMs?: number | null) {
  if (durationMs == null) return "text-neutral-400";
  if (durationMs < 250) return "text-emerald-700";
  if (durationMs < 1000) return "text-amber-700";
  return "text-red-700";
}

function percent(value: number | null) {
  return value == null ? "Not enough data" : `${Math.round(value * 100)}%`;
}

function healthStatusStyle(status: PlatformHealthStatus) {
  if (status === "healthy") return "border-emerald-300 bg-emerald-50 text-emerald-950";
  if (status === "degraded") return "border-amber-300 bg-amber-50 text-amber-950";
  if (status === "failing") return "border-red-300 bg-red-50 text-red-950";
  return "border-neutral-300 bg-neutral-50 text-neutral-800";
}

function statusLabel(status: PlatformHealthStatus) {
  if (status === "insufficient-data") return "Insufficient data";
  return status[0].toUpperCase() + status.slice(1);
}

const SURFACES: Array<{ key: SurfaceFilter; label: string }> = [
  { key: "all", label: "All surfaces" },
  { key: "student", label: "Student" },
  { key: "teacher", label: "Teacher" },
  { key: "lesson", label: "Lesson" },
  { key: "live-game", label: "Live game" },
  { key: "parent", label: "Parent" },
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
  health,
}: {
  centralEvents: CentralDiagnosticEvent[];
  centralError: string | null;
  health: PlatformHealthSnapshot;
}) {
  const [localEvents, setLocalEvents] = useState<AppDiagnosticEvent[]>([]);
  const [surface, setSurface] = useState<SurfaceFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [journey, setJourney] = useState<JourneyFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [release, setRelease] = useState("all");
  const [device, setDevice] = useState("all");
  const [query, setQuery] = useState("");
  const [activeIssueFingerprint, setActiveIssueFingerprint] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setLocalEvents(readAppDiagnosticEvents());
    const timer = window.setTimeout(refresh, 0);
    const unsubscribe = subscribeToAppDiagnostics(refresh);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const filteredIssues = useMemo(() => health.issueGroups.filter((issue) => {
    if (journey !== "all" && issue.journey !== journey) return false;
    if (surface !== "all" && issue.surface !== surface) return false;
    if (severity !== "all" && issue.severity !== severity) return false;
    if (release !== "all" && issue.latestRelease !== release) return false;
    if (device !== "all" && !issue.devices.some((item) => item.name === device)) return false;
    return true;
  }), [device, health.issueGroups, journey, release, severity, surface]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return centralEvents.filter((event) => {
      if (activeIssueFingerprint && diagnosticIssueFingerprint(event) !== activeIssueFingerprint) return false;
      if (surface !== "all" && event.surface !== surface) return false;
      if (kind !== "all" && event.kind !== kind) return false;
      if (!needle) return true;
      return [event.userLabel, event.name, event.phase, event.route, event.activityId, event.homeworkId, event.errorCode]
        .some((value) => value?.toLowerCase().includes(needle));
    });
  }, [activeIssueFingerprint, centralEvents, kind, query, surface]);

  const uniqueUsers = new Set(centralEvents.map((event) => event.userLabel)).size;
  const uniqueSessions = new Set(centralEvents.map((event) => event.sessionId)).size;
  const errors = centralEvents.filter((event) => event.kind === "error").length;
  const durations = centralEvents
    .map((event) => event.durationMs)
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);
  const p95 = durations.length > 0 ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))] : null;

  function showIssue(fingerprint: string) {
    setActiveIssueFingerprint(fingerprint);
    setKind("all");
    setQuery("");
    window.setTimeout(() => document.getElementById("diagnostic-timeline")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  return (
    <div className="space-y-6">
      {centralError ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950" role="status">
          {centralError}
        </p>
      ) : null}

      <section className="space-y-4" aria-labelledby="journey-health-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="journey-health-heading" className="text-lg font-bold text-neutral-950">Learning-journey health</h2>
            <p className="text-sm text-neutral-600">Advisory status from explicit outcomes; missing evidence is never shown as healthy.</p>
          </div>
          <nav className="flex flex-wrap gap-1.5" aria-label="Health time window">
            {PLATFORM_HEALTH_WINDOWS.map((hours) => (
              <a
                key={hours}
                href={`?hours=${hours}`}
                aria-current={health.windowHours === hours ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${health.windowHours === hours ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white text-neutral-700"}`}
              >
                {hours === 168 ? "7 days" : `${hours} hours`}
              </a>
            ))}
          </nav>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {health.journeys.map((item) => (
            <article key={item.id} className={`rounded-xl border p-4 ${healthStatusStyle(item.status)}`}>
              <p className="text-xs font-bold uppercase tracking-wide">{item.label}</p>
              <p className="mt-2 text-xl font-black">{statusLabel(item.status)}</p>
              <p className="mt-2 text-sm font-semibold">
                {item.successes} success · {item.failures} failure · {percent(item.failureRate)} failure rate
              </p>
              <p className="mt-2 text-xs leading-5 opacity-80">{item.rule}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="issue-groups-heading">
        <div>
          <h2 id="issue-groups-heading" className="text-lg font-bold text-neutral-950">Actionable issues</h2>
          <p className="text-sm text-neutral-600">Repeated failures are grouped by safe structure, route pattern, and release—not error text or student work.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-bold text-neutral-700">
            Journey
            <select value={journey} onChange={(event) => setJourney(event.target.value as JourneyFilter)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm font-medium">
              <option value="all">All journeys</option>
              {PLATFORM_HEALTH_JOURNEYS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-neutral-700">
            Severity
            <select value={severity} onChange={(event) => setSeverity(event.target.value as SeverityFilter)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm font-medium">
              <option value="all">All severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="warning">Warning</option>
            </select>
          </label>
          <label className="text-xs font-bold text-neutral-700">
            Release
            <select value={release} onChange={(event) => setRelease(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm font-medium">
              <option value="all">All releases</option>
              {health.releases.map((item) => <option key={item} value={item}>{item.slice(0, 12)}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-neutral-700">
            Device
            <select value={device} onChange={(event) => setDevice(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm font-medium">
              <option value="all">All devices</option>
              {health.devices.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-neutral-700">
            Surface
            <select value={surface} onChange={(event) => setSurface(event.target.value as SurfaceFilter)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm font-medium">
              {SURFACES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label>
        </div>

        {filteredIssues.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-600">
            {health.totalEvents === 0 ? "No diagnostic events were received in this window." : "No issue groups match these filters."}
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredIssues.map((issue) => (
              <article key={issue.fingerprint} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-neutral-500">{issue.severity} · {issue.trend}</p>
                    <h3 className="mt-1 font-bold text-neutral-950">{issue.phase} · {issue.name}</h3>
                    <p className="mt-1 font-mono text-xs text-red-800">{issue.errorCode}</p>
                  </div>
                  <p className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-black text-neutral-900">{issue.count} events</p>
                </div>
                <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  <div><dt className="font-bold text-neutral-500">Journey</dt><dd>{PLATFORM_HEALTH_JOURNEYS.find((item) => item.id === issue.journey)?.label}</dd></div>
                  <div><dt className="font-bold text-neutral-500">Release</dt><dd className="font-mono text-xs">{issue.latestRelease.slice(0, 16)}</dd></div>
                  <div><dt className="font-bold text-neutral-500">Affected sessions</dt><dd>{issue.affectedSessions}</dd></div>
                  <div><dt className="font-bold text-neutral-500">Affected users</dt><dd>{issue.affectedUsers ?? "Suppressed below 3"}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-bold text-neutral-500">Route pattern</dt><dd className="break-all font-mono text-xs">{issue.routePattern}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-bold text-neutral-500">Devices</dt><dd>{issue.devices.map((item) => `${item.name} ${item.count}`).join(" · ")}</dd></div>
                  <div><dt className="font-bold text-neutral-500">First seen</dt><dd>{new Date(issue.firstOccurrence).toLocaleString()}</dd></div>
                  <div><dt className="font-bold text-neutral-500">Latest</dt><dd>{new Date(issue.latestOccurrence).toLocaleString()}</dd></div>
                </dl>
                <button type="button" onClick={() => showIssue(issue.fingerprint)} className="mt-4 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-bold text-neutral-800 hover:bg-neutral-50">
                  Show matching safe timeline
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          [`Events (${health.windowHours}h)`, centralEvents.length],
          ["Users", uniqueUsers],
          ["Sessions", uniqueSessions],
          ["Errors", errors],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${label === "Errors" && Number(value) > 0 ? "text-red-700" : "text-neutral-900"}`}>{value}</p>
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
          placeholder="User, event, homework, route, error…"
          className="min-w-[240px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        {KINDS.map((item) => (
          <button key={item.key} type="button" onClick={() => setKind(item.key)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === item.key ? "bg-cyan-800 text-white" : "border border-neutral-300 bg-white text-neutral-700"}`}>
            {item.label}
          </button>
        ))}
        {activeIssueFingerprint ? (
          <button type="button" onClick={() => setActiveIssueFingerprint(null)} className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950">
            Clear issue drill-down
          </button>
        ) : null}
      </div>

      <section id="diagnostic-timeline" className="scroll-mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="font-bold text-neutral-900">Privacy-limited event timeline</h2>
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
                <span className={event.kind === "error" ? "font-semibold text-red-800" : "text-neutral-900"}>{event.phase} · {event.name}</span>
                <span className={`font-mono text-xs ${durationColor(event.durationMs)}`}>{formatDuration(event.durationMs)}</span>
              </summary>
              <div className="mt-2 grid gap-1 rounded-lg bg-neutral-50 p-3 font-mono text-xs text-neutral-600 sm:grid-cols-2">
                <p>{new Date(event.occurredAt).toLocaleString()}</p>
                <p>session: {event.sessionId}</p>
                {event.route ? <p>route: {event.route}</p> : null}
                {event.activityId ? <p>activity: {event.activityId}</p> : null}
                {event.homeworkId ? <p>homework: {event.homeworkId}</p> : null}
                {event.classroomSessionId ? <p>classroom session: {event.classroomSessionId}</p> : null}
                {event.status ? <p>status: {event.status}</p> : null}
                {event.errorCode ? <p className="text-red-800">error: {event.errorCode}</p> : null}
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
