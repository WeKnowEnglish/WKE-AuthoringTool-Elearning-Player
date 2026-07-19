"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearCollabDiagnosticEvents,
  collabDiagnosticPanelEnabled,
  collabDiagnosticsEnabled,
  readCollabDiagnosticEvents,
  recordCollabDiagnostic,
  subscribeToCollabDiagnostics,
} from "@/lib/collab-diagnostics/client";
import type { CollabDiagEvent, CollabDiagPhase } from "@/lib/collab-diagnostics/types";

type ViewFilter = CollabDiagPhase | "all";

const FILTERS: Array<{ key: ViewFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "enter", label: "Enter" },
  { key: "classroom", label: "Classroom" },
  { key: "join", label: "Join" },
  { key: "launch", label: "Launch" },
  { key: "submit", label: "Submit" },
  { key: "command", label: "Command" },
  { key: "liveblocks", label: "Liveblocks" },
  { key: "system", label: "System" },
];

type PanelProps = {
  /** Surface label recorded on the enter mark. */
  activity?: "whiteboard" | "classroom";
  /** When false, nothing mounts (students). Defaults true for host surfaces. */
  enabled?: boolean;
};

function durationColor(durationMs?: number) {
  if (durationMs == null) return "text-slate-400";
  if (durationMs < 250) return "text-emerald-300";
  if (durationMs < 1000) return "text-amber-300";
  return "text-red-300";
}

function formatDuration(durationMs?: number) {
  if (durationMs == null) return "—";
  return durationMs < 1000
    ? `${Math.round(durationMs)} ms`
    : `${(durationMs / 1000).toFixed(2)} s`;
}

function summaryLine(event: CollabDiagEvent | undefined) {
  if (!event) return "Ready";
  const serverMs =
    typeof event.detail?.serverMs === "number" ? event.detail.serverMs : null;
  const networkMs =
    typeof event.detail?.networkOrQueueMs === "number"
      ? event.detail.networkOrQueueMs
      : null;
  const parts = [`${event.name} ${formatDuration(event.durationMs)}`];
  if (serverMs != null || networkMs != null) {
    parts.push(
      `(server ${serverMs ?? "—"} / net ${networkMs ?? "—"})`,
    );
  }
  return parts.join(" ");
}

export function CollabDiagnosticsPanel({
  activity = "whiteboard",
  enabled = true,
}: PanelProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [events, setEvents] = useState<CollabDiagEvent[]>([]);

  useEffect(() => {
    if (!enabled || !collabDiagnosticsEnabled()) return;
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    recordCollabDiagnostic(
      "enter",
      "collab_route_loaded",
      navigation
        ? {
            ttfbMs: Math.round(navigation.responseStart),
            domInteractiveMs: Math.round(navigation.domInteractive),
            loadMs: Math.round(navigation.loadEventEnd || performance.now()),
            activity,
          }
        : { activity },
    );
    const refresh = () => setEvents(readCollabDiagnosticEvents());
    refresh();
    return subscribeToCollabDiagnostics(refresh);
  }, [activity, enabled]);

  const visible = useMemo(
    () =>
      events
        .filter((event) => filter === "all" || event.phase === filter)
        .slice()
        .reverse(),
    [events, filter],
  );

  const spans = events.filter((e) => e.kind === "span" && e.durationMs != null);
  const latestSpan = spans.at(-1);
  const errors = events.filter((e) => e.kind === "error").length;

  if (!enabled || !collabDiagnosticPanelEnabled()) return null;

  return (
    <aside className="pointer-events-auto fixed inset-x-0 bottom-0 z-[100] font-mono text-xs text-white">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-10 w-full items-center justify-between gap-3 border-t-4 border-black bg-[#ff8a00] px-4 py-2 text-left font-black text-black shadow-xl hover:bg-[#ff9d21]"
        >
          <span>COLLAB DIAG</span>
          <span className="truncate text-right text-[11px] font-bold sm:text-xs">
            last: {summaryLine(latestSpan)}
            {errors ? ` · ${errors} errors` : ""}
          </span>
        </button>
      ) : (
        <div className="mx-auto flex max-h-[55dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border-x-4 border-t-4 border-black bg-slate-950 shadow-2xl">
          <div className="flex min-h-10 items-center justify-between gap-3 border-b-4 border-black bg-[#ff8a00] px-4 py-2 text-black">
            <div>
              <p className="font-black">COLLAB DIAGNOSTICS</p>
              <p className="text-[10px] font-bold text-black/70">
                local sessionStorage · {activity} · classroom + whiteboard
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border-2 border-black bg-orange-100 px-3 py-1 font-black text-black hover:bg-white"
            >
              Collapse ↓
            </button>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded px-2 py-1 ${
                  filter === item.key
                    ? "bg-cyan-300 text-slate-950"
                    : "bg-white/5 text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 border-b border-white/10 p-2 text-center">
            <div className="rounded bg-white/5 p-2">
              <p className="text-slate-400">Events</p>
              <p className="text-lg font-bold">{events.length}</p>
            </div>
            <div className="rounded bg-white/5 p-2">
              <p className="text-slate-400">Errors</p>
              <p
                className={`text-lg font-bold ${errors ? "text-red-300" : "text-emerald-300"}`}
              >
                {errors}
              </p>
            </div>
            <div className="rounded bg-white/5 p-2">
              <p className="text-slate-400">Latest</p>
              <p className={`text-sm font-bold ${durationColor(latestSpan?.durationMs)}`}>
                {formatDuration(latestSpan?.durationMs)}
              </p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visible.length ? (
              visible.map((event) => (
                <details
                  key={event.id}
                  className="border-b border-white/5 px-3 py-2"
                >
                  <summary className="grid cursor-pointer grid-cols-[70px_1fr_auto] items-center gap-2">
                    <span className="uppercase text-slate-500">{event.phase}</span>
                    <span
                      className={
                        event.kind === "error" ? "text-red-300" : "text-slate-100"
                      }
                    >
                      {event.name}
                    </span>
                    <span className={durationColor(event.durationMs)}>
                      {formatDuration(event.durationMs)}
                    </span>
                  </summary>
                  <div className="mt-2 whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-[10px] text-slate-400">
                    {new Date(event.at).toLocaleTimeString()}
                    {"\n"}
                    {JSON.stringify(event.detail ?? {}, null, 2)}
                  </div>
                </details>
              ))
            ) : (
              <p className="p-6 text-center text-slate-400">No events yet.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/10 p-2">
            <button
              type="button"
              onClick={() => clearCollabDiagnosticEvents()}
              className="rounded bg-white/10 px-2 py-1"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard.writeText(JSON.stringify(events, null, 2))
              }
              className="rounded bg-white/10 px-2 py-1"
            >
              Copy JSON
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
