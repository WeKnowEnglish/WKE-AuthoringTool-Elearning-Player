"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";
import type { GlobalTimerState } from "@/lib/classroom-tools/timer";
import {
  createIdleGlobalTimer,
  elapsedMs,
  formatTimerMs,
  remainingMs,
} from "@/lib/classroom-tools/timer";

type Props = {
  busy: boolean;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
  /** Supabase timer pilot state; omit to retain the Liveblocks source. */
  timer?: GlobalTimerState | null;
};

function readTimer(root: unknown): GlobalTimerState {
  const runtime = (root as { runtime?: unknown }).runtime;
  return (
    readLiveObjectField<GlobalTimerState>(runtime, "timer") ?? createIdleGlobalTimer()
  );
}

export function GlobalTimerPanel(props: Props) {
  const liveblocksTimer = useStorage((root) => readTimer(root));
  return <GlobalTimerPanelContent {...props} timer={props.timer ?? liveblocksTimer} />;
}

/** Provider-neutral timer UI for the Supabase-native classroom shell. */
export function GlobalTimerPanelContent({
  busy,
  onCommand,
  timer,
}: Omit<Props, "timer"> & { timer: GlobalTimerState }) {
  const [now, setNow] = useState(() => Date.now());
  const [minutes, setMinutes] = useState(1);

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer.status]);

  const displayMs =
    timer.mode === "stopwatch" ? elapsedMs(timer, now) : remainingMs(timer, now);

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Timer</h2>
        <p className="text-xs text-slate-500">Global session timer · survives activity switches</p>
      </div>

      <p className="text-center font-mono text-4xl font-extrabold tabular-nums text-slate-900">
        {formatTimerMs(displayMs)}
      </p>
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        {timer.mode} · {timer.status}
        {!timer.visibleToStudents ? " · hidden from students" : ""}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className={`rounded px-2 py-1 text-xs font-bold ${
            timer.mode === "countdown" ? "bg-teal-800 text-white" : "bg-slate-100"
          }`}
          onClick={() => void onCommand({ type: "SET_TIMER_MODE", mode: "countdown" })}
        >
          Countdown
        </button>
        <button
          type="button"
          disabled={busy}
          className={`rounded px-2 py-1 text-xs font-bold ${
            timer.mode === "stopwatch" ? "bg-teal-800 text-white" : "bg-slate-100"
          }`}
          onClick={() => void onCommand({ type: "SET_TIMER_MODE", mode: "stopwatch" })}
        >
          Stopwatch
        </button>
      </div>

      {timer.mode === "countdown" && (
        <label className="block text-xs font-semibold text-slate-700">
          Minutes
          <input
            type="number"
            min={1}
            max={60}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 w-20 rounded border border-slate-300 px-2 py-1"
          />
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white"
          onClick={() =>
            void onCommand({
              type: "START_TIMER",
              durationMs: timer.mode === "countdown" ? minutes * 60_000 : timer.durationMs,
            })
          }
        >
          Start
        </button>
        <button
          type="button"
          disabled={busy || timer.status !== "running"}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40"
          onClick={() => void onCommand({ type: "PAUSE_TIMER" })}
        >
          Pause
        </button>
        <button
          type="button"
          disabled={busy || timer.status !== "paused"}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40"
          onClick={() => void onCommand({ type: "RESUME_TIMER" })}
        >
          Resume
        </button>
        <button
          type="button"
          disabled={busy || timer.mode !== "countdown"}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40"
          onClick={() => void onCommand({ type: "ADD_TIMER_MS", milliseconds: 60_000 })}
        >
          +1 min
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold"
          onClick={() =>
            void onCommand({
              type: "RESET_TIMER",
              durationMs: timer.mode === "countdown" ? minutes * 60_000 : timer.durationMs,
            })
          }
        >
          Reset
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold"
          onClick={() =>
            void onCommand({
              type: "SET_TIMER_VISIBLE",
              visibleToStudents: !timer.visibleToStudents,
            })
          }
        >
          {timer.visibleToStudents ? "Hide from students" : "Show to students"}
        </button>
      </div>
    </section>
  );
}

/** Compact timer display for students (and host header). */
export function GlobalTimerBanner({
  role,
  timer: pilotTimer,
}: {
  role: "host" | "member";
  timer?: GlobalTimerState | null;
}) {
  const liveblocksTimer = useStorage((root) => readTimer(root));
  const timer = pilotTimer ?? liveblocksTimer;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer.status]);

  if (role === "member" && !timer.visibleToStudents) return null;
  if (timer.status === "idle" && timer.mode === "countdown") return null;

  const displayMs =
    timer.mode === "stopwatch" ? elapsedMs(timer, now) : remainingMs(timer, now);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Class timer
      </p>
      <p className="font-mono text-2xl font-extrabold tabular-nums text-slate-900">
        {formatTimerMs(displayMs)}
      </p>
    </div>
  );
}
