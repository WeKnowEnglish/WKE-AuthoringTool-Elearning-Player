"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getLiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import {
  clearLiveGameDiagnosticEvents,
  liveGameDiagnosticPanelEnabled,
  liveGameDiagnosticsEnabled,
  readLiveGameDiagnosticEvents,
  recordLiveGameDiagnostic,
  subscribeToLiveGameDiagnostics,
} from "@/lib/live-game/diagnostics/client";
import type { LiveGameDiagnosticEvent, LiveGameDiagnosticPhase } from "@/lib/live-game/diagnostics/types";

type DiagnosticView = LiveGameDiagnosticPhase | "all" | "attempts";

const PHASES: Array<{ key: DiagnosticView; label: string }> = [
  { key: "all", label: "Journey" },
  { key: "entry", label: "Entry" },
  { key: "room", label: "Room" },
  { key: "lobby", label: "Lobby" },
  { key: "gameplay", label: "Game" },
  { key: "attempts", label: "Attempts" },
  { key: "exit", label: "Exit" },
  { key: "report", label: "Report" },
];

function durationColor(durationMs?: number) {
  if (durationMs == null) return "text-slate-400";
  if (durationMs < 250) return "text-emerald-300";
  if (durationMs < 1000) return "text-amber-300";
  return "text-red-300";
}

function formatDuration(durationMs?: number) {
  if (durationMs == null) return "—";
  return durationMs < 1000 ? `${Math.round(durationMs)} ms` : `${(durationMs / 1000).toFixed(2)} s`;
}

function enrichEvents(events: LiveGameDiagnosticEvent[]) {
  const context = getLiveGameSessionContext();
  if (!context) return events;
  const roomId = toRoomId(context.sessionId);
  return events.map((event) => ({
    ...event,
    roomId: event.roomId ?? roomId,
    role: event.role ?? context.role,
    displayName: event.displayName ?? context.displayName,
  }));
}

export function LiveGamePerformancePanel() {
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<DiagnosticView>("all");
  const [localEvents, setLocalEvents] = useState<LiveGameDiagnosticEvent[]>([]);
  const [roomEvents, setRoomEvents] = useState<LiveGameDiagnosticEvent[]>([]);
  const uploadedIds = useRef(new Set<string>());

  useEffect(() => {
    if (!liveGameDiagnosticsEnabled()) return;
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    recordLiveGameDiagnostic("entry", "live_game_route_loaded", navigation ? {
      ttfbMs: Math.round(navigation.responseStart),
      domInteractiveMs: Math.round(navigation.domInteractive),
      loadMs: Math.round(navigation.loadEventEnd || performance.now()),
      navigationType: navigation.type,
    } : undefined);
    const refresh = () => setLocalEvents(enrichEvents(readLiveGameDiagnosticEvents()));
    refresh();
    return subscribeToLiveGameDiagnostics(refresh);
  }, []);

  useEffect(() => {
    if (!liveGameDiagnosticsEnabled() || paused) return;
    let cancelled = false;
    async function sync() {
      const enriched = enrichEvents(readLiveGameDiagnosticEvents());
      const pending = enriched.filter((event) => !uploadedIds.current.has(event.id));
      if (pending.length) {
        const batch = pending.slice(0, 100);
        try {
          const endpoint = process.env.NODE_ENV === "production" ?
            "/api/live-game/diagnostics"
          : "/api/dev/live-game-diagnostics";
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: batch }),
          });
          if (response.ok) batch.forEach((event) => uploadedIds.current.add(event.id));
        } catch {
          // The diagnostics endpoint is deliberately non-critical.
        }
      }
      const context = getLiveGameSessionContext();
      if (process.env.NODE_ENV !== "production" && context?.role === "host") {
        try {
          const roomId = toRoomId(context.sessionId);
          const response = await fetch(`/api/dev/live-game-diagnostics?roomId=${encodeURIComponent(roomId)}`, { cache: "no-store" });
          const payload = (await response.json()) as { events?: LiveGameDiagnosticEvent[] };
          if (!cancelled && response.ok) setRoomEvents(payload.events ?? []);
        } catch {
          // Local-only aggregation can disappear during a dev-server restart.
        }
      }
    }
    void sync();
    const uploadIntervalMs = process.env.NODE_ENV === "production" ? 3_000 : 1_500;
    const interval = window.setInterval(() => void sync(), uploadIntervalMs);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [paused]);

  // Keep exporting the aggregated room history after the session context is
  // cleared at round end; otherwise a long run falls back to one device's cap.
  const visibleSource = roomEvents.length ? roomEvents : localEvents;
  const visibleEvents = useMemo(
    () => visibleSource.filter((event) =>
      phase === "all" ||
      (phase === "attempts" ? event.name.startsWith("question_attempt") : event.phase === phase)
    ).slice().reverse(),
    [phase, visibleSource],
  );
  const devices = new Set(visibleSource.map((event) => event.deviceId)).size;
  const errors = visibleSource.filter((event) => event.kind === "error").length;
  const questionAttempts = visibleSource.filter((event) => event.name === "question_attempt").length;
  const rejectedAttempts = visibleSource.filter((event) => event.name === "question_attempt_rejected").length;
  const spans = visibleSource.filter((event) => event.kind === "span" && event.durationMs != null);
  const latestSpan = spans.at(-1);

  function exportAllEvents() {
    const payload = JSON.stringify(visibleSource, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `live-game-diagnostics-${new Date().toISOString().replaceAll(":", "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (!liveGameDiagnosticPanelEnabled()) return null;

  return (
    <aside className="pointer-events-auto fixed inset-x-0 top-0 z-[100] font-mono text-xs text-white">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 w-full items-center justify-between gap-3 border-b-4 border-black bg-[#ff8a00] px-4 py-2 text-left font-black text-black shadow-xl hover:bg-[#ff9d21] focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-black"
          aria-expanded="false"
        >
          <span>LIVE GAME DIAGNOSTICS</span>
          <span className="text-right text-[11px] sm:text-xs">
            {latestSpan ? formatDuration(latestSpan.durationMs) : "Ready"}{errors ? ` · ${errors} errors` : ""} · Click to expand
          </span>
        </button>
      ) : (
        <div className="mx-auto flex max-h-[78dvh] w-full max-w-5xl flex-col overflow-hidden rounded-b-2xl border-x-4 border-b-4 border-black bg-slate-950 shadow-2xl">
          <div className="flex min-h-12 items-center justify-between gap-3 border-b-4 border-black bg-[#ff8a00] px-4 py-2 text-black">
            <div><p className="font-black">LIVE GAME DIAGNOSTICS</p><p className="text-[10px] font-bold text-black/70">{devices || 1} device{devices === 1 ? "" : "s"} · memory only · {paused ? "paused" : "recording"}</p></div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={exportAllEvents}
                className="rounded border-2 border-black bg-white px-3 py-1 font-black text-black hover:bg-orange-100"
              >
                Export all
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border-2 border-black bg-orange-100 px-3 py-1 font-black text-black hover:bg-white"
                aria-expanded="true"
              >
                Collapse ↑
              </button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">
            {PHASES.map((item) => <button key={item.key} type="button" onClick={() => setPhase(item.key)} className={`rounded px-2 py-1 ${phase === item.key ? "bg-cyan-300 text-slate-950" : "bg-white/5 text-slate-300"}`}>{item.label}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-2 text-center sm:grid-cols-5">
            <div className="rounded bg-white/5 p-2"><p className="text-slate-400">Events</p><p className="text-lg font-bold">{visibleSource.length}</p></div>
            <div className="rounded bg-white/5 p-2"><p className="text-slate-400">Errors</p><p className={`text-lg font-bold ${errors ? "text-red-300" : "text-emerald-300"}`}>{errors}</p></div>
            <div className="rounded bg-white/5 p-2"><p className="text-slate-400">Attempts</p><p className="text-lg font-bold text-cyan-300">{questionAttempts}</p></div>
            <div className="rounded bg-white/5 p-2"><p className="text-slate-400">Rejected</p><p className={`text-lg font-bold ${rejectedAttempts ? "text-red-300" : "text-emerald-300"}`}>{rejectedAttempts}</p></div>
            <div className="rounded bg-white/5 p-2"><p className="text-slate-400">Latest</p><p className={`text-lg font-bold ${durationColor(latestSpan?.durationMs)}`}>{formatDuration(latestSpan?.durationMs)}</p></div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleEvents.length ? visibleEvents.map((event) => (
              <details key={`${event.deviceId}:${event.id}`} className="border-b border-white/5 px-3 py-2">
                <summary className="grid cursor-pointer grid-cols-[62px_1fr_auto] items-center gap-2">
                  <span className="uppercase text-slate-500">{event.phase}</span>
                  <span className={event.kind === "error" ? "text-red-300" : "text-slate-100"}>{event.name}</span>
                  <span className={durationColor(event.durationMs)}>{formatDuration(event.durationMs)}</span>
                </summary>
                <div className="mt-2 whitespace-pre-wrap break-words rounded bg-black/30 p-2 text-[10px] text-slate-400">
                  {event.displayName ? `${event.displayName} · ${event.role}\n` : ""}{new Date(event.at).toLocaleTimeString()}\n{JSON.stringify(event.detail ?? {}, null, 2)}
                </div>
              </details>
            )) : <p className="p-6 text-center text-slate-400">No events in this phase yet.</p>}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/10 p-2">
            <button type="button" onClick={() => setPaused((value) => !value)} className="rounded bg-white/10 px-2 py-1">{paused ? "Resume" : "Pause"}</button>
            <button type="button" onClick={() => { clearLiveGameDiagnosticEvents(); setRoomEvents([]); }} className="rounded bg-white/10 px-2 py-1">Clear</button>
            <button type="button" onClick={() => void navigator.clipboard.writeText(JSON.stringify(visibleSource, null, 2))} className="rounded bg-white/10 px-2 py-1">Copy JSON</button>
          </div>
        </div>
      )}
    </aside>
  );
}
