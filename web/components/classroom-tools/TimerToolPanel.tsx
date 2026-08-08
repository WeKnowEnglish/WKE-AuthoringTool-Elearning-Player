"use client";

import { useEffect, useState } from "react";
import {
  elapsedMs,
  formatTimerMs,
  remainingMs,
  type GlobalTimerMode,
  type GlobalTimerState,
} from "@/lib/classroom-tools/timer";

const PRESETS = [
  { label: "1m", minutes: 1 },
  { label: "2m", minutes: 2 },
  { label: "5m", minutes: 5 },
  { label: "10m", minutes: 10 },
] as const;

type Props = {
  timer: GlobalTimerState;
  minutes: number;
  onMinutesChange: (minutes: number) => void;
  onModeChange: (mode: GlobalTimerMode) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onTick?: (nowMs: number) => void;
  /** Hide student-visibility controls (local toolkit). */
  compact?: boolean;
};

export function TimerToolPanel({
  timer,
  minutes,
  onMinutesChange,
  onModeChange,
  onStart,
  onPause,
  onResume,
  onReset,
  onTick,
  compact = false,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      onTick?.(t);
    }, 250);
    return () => window.clearInterval(id);
  }, [timer.status, onTick]);

  const displayMs =
    timer.mode === "stopwatch" ? elapsedMs(timer, now) : remainingMs(timer, now);

  return (
    <section className="space-y-3">
      {!compact ? (
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Timer</h2>
          <p className="text-[11px] text-stone-500">Countdown or stopwatch</p>
        </div>
      ) : null}

      <p className="text-center font-mono text-4xl font-extrabold tabular-nums text-stone-900">
        {formatTimerMs(displayMs)}
      </p>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {timer.mode} · {timer.status}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`rounded-md px-2 py-1 text-xs font-bold ${
            timer.mode === "countdown"
              ? "bg-teal-800 text-white"
              : "bg-stone-100 text-stone-700"
          }`}
          onClick={() => onModeChange("countdown")}
        >
          Countdown
        </button>
        <button
          type="button"
          className={`rounded-md px-2 py-1 text-xs font-bold ${
            timer.mode === "stopwatch"
              ? "bg-teal-800 text-white"
              : "bg-stone-100 text-stone-700"
          }`}
          onClick={() => onModeChange("stopwatch")}
        >
          Stopwatch
        </button>
      </div>

      {timer.mode === "countdown" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  minutes === preset.minutes
                    ? "bg-stone-900 text-white"
                    : "border border-stone-200 bg-white text-stone-700"
                }`}
                onClick={() => onMinutesChange(preset.minutes)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="block text-[11px] font-semibold text-stone-700">
            Minutes
            <input
              type="number"
              min={1}
              max={120}
              value={minutes}
              onChange={(e) =>
                onMinutesChange(Math.max(1, Number(e.target.value) || 1))
              }
              className="mt-1 w-20 rounded border border-stone-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white"
          onClick={onStart}
        >
          Start
        </button>
        <button
          type="button"
          disabled={timer.status !== "running"}
          className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
          onClick={onPause}
        >
          Pause
        </button>
        <button
          type="button"
          disabled={timer.status !== "paused"}
          className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
          onClick={onResume}
        >
          Resume
        </button>
        <button
          type="button"
          className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-bold"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
