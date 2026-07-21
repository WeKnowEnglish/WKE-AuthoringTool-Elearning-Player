"use client";

import { useState } from "react";
import { WORKSHEET_PRESETS } from "@/lib/whiteboard/domain";
import {
  normalizeWhiteboardLaunchPayload,
  whiteboardLaunchStartLabel,
  WHITEBOARD_LAUNCH_MODE_OPTIONS,
  WHITEBOARD_TIMER_OPTIONS_MINUTES,
  type WhiteboardLaunchPayload,
} from "@/lib/whiteboard/launch-options";

export type { WhiteboardLaunchPayload };

type Props = {
  busy: boolean;
  initial?: Partial<WhiteboardLaunchPayload>;
  submitLabel?: string;
  busyLabel?: string;
  onLaunch: (payload: WhiteboardLaunchPayload) => void;
};

export function WhiteboardLaunchPanel({
  busy,
  initial,
  submitLabel,
  busyLabel = "Starting…",
  onLaunch,
}: Props) {
  const seed = normalizeWhiteboardLaunchPayload(initial ?? {});
  const [mode, setMode] = useState(seed.mode);
  const [worksheetPresetId, setWorksheetPresetId] = useState<string | null>(
    seed.worksheetPresetId,
  );
  const [timerMinutes, setTimerMinutes] = useState(seed.timerMinutes);
  const [title, setTitle] = useState(seed.title);
  const [instructions, setInstructions] = useState(seed.instructions);

  return (
    <div className="space-y-2 rounded-lg border border-teal-100 bg-teal-50/60 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-900">Whiteboard</p>

      <div className="flex flex-wrap gap-2">
        {WHITEBOARD_LAUNCH_MODE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            onClick={() => setMode(value)}
            className={`rounded px-3 py-1.5 text-sm font-bold ${
              mode === value
                ? "bg-teal-800 text-white"
                : "bg-white text-slate-800 ring-1 ring-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "group" && (
        <p className="text-xs text-slate-600">
          Generate groups first (or send them after launch) via Group maker → Send to whiteboard.
        </p>
      )}
      {mode === "teacher_demo" && (
        <p className="text-xs text-slate-600">
          You lead on the demo board. Students watch and follow; they keep personal boards for
          practice if needed.
        </p>
      )}

      <label className="block text-xs font-semibold text-slate-700">
        Worksheet
        <select
          value={worksheetPresetId ?? ""}
          disabled={busy}
          onChange={(e) => setWorksheetPresetId(e.target.value || null)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        >
          <option value="">Blank board</option>
          {WORKSHEET_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Timer
        <select
          value={timerMinutes}
          disabled={busy}
          onChange={(e) => setTimerMinutes(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        >
          {WHITEBOARD_TIMER_OPTIONS_MINUTES.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Title
        <input
          type="text"
          value={title}
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        />
      </label>

      <label className="block text-xs font-semibold text-slate-700">
        Instructions
        <textarea
          value={instructions}
          disabled={busy}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
        />
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          onLaunch(
            normalizeWhiteboardLaunchPayload({
              mode,
              worksheetPresetId,
              timerMinutes,
              title,
              instructions,
            }),
          )
        }
        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? busyLabel : submitLabel ?? whiteboardLaunchStartLabel(mode)}
      </button>
    </div>
  );
}
