"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useState } from "react";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";
import type { DicePreset, RandomiserState } from "@/lib/virtual-classroom/tools/dice";
import { createEmptyRandomiser } from "@/lib/virtual-classroom/tools/dice";

type Props = {
  busy: boolean;
  role: "host" | "member";
  onCommand: (command: Record<string, unknown>) => Promise<void>;
};

function readRandomiser(root: unknown): RandomiserState {
  const runtime = (root as { runtime?: unknown }).runtime;
  return (
    readLiveObjectField<RandomiserState>(runtime, "randomiser") ?? createEmptyRandomiser()
  );
}

const PRESETS: { id: DicePreset; label: string }[] = [
  { id: "d6", label: "1d6" },
  { id: "2d6", label: "2d6" },
  { id: "d10", label: "d10" },
  { id: "d20", label: "d20" },
  { id: "custom", label: "Custom" },
  { id: "labels", label: "Labels" },
];

export function DicePanel({ busy, role, onCommand }: Props) {
  const randomiser = useStorage((root) => readRandomiser(root));
  const [sides, setSides] = useState(8);
  const [labelText, setLabelText] = useState("cat, dog, bird, fish");

  const canSeeRoll =
    role === "host" ||
    randomiser.visibility === "class" ||
    !randomiser.lastRoll ||
    randomiser.lastRoll.visibility === "class";

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Dice</h2>
        <p className="text-xs text-slate-500">Session randomiser · public or teacher-only rolls</p>
      </div>

      {role === "host" && (
        <>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={busy}
                className={`rounded px-2 py-1 text-xs font-bold ${
                  randomiser.preset === p.id ? "bg-sky-800 text-white" : "bg-slate-100"
                }`}
                onClick={() => {
                  if (p.id === "custom") {
                    void onCommand({ type: "CONFIGURE_DICE", preset: "custom", sides });
                  } else if (p.id === "labels") {
                    void onCommand({
                      type: "CONFIGURE_DICE",
                      preset: "labels",
                      labels: labelText.split(",").map((s) => s.trim()),
                    });
                  } else {
                    void onCommand({ type: "CONFIGURE_DICE", preset: p.id });
                  }
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {randomiser.preset === "custom" && (
            <label className="block text-xs font-semibold text-slate-700">
              Sides
              <input
                type="number"
                min={2}
                max={100}
                value={sides}
                onChange={(e) => setSides(Number(e.target.value) || 2)}
                onBlur={() =>
                  void onCommand({ type: "CONFIGURE_DICE", preset: "custom", sides })
                }
                className="mt-1 w-20 rounded border border-slate-300 px-2 py-1"
              />
            </label>
          )}

          {randomiser.preset === "labels" && (
            <label className="block text-xs font-semibold text-slate-700">
              Labels (comma-separated)
              <input
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onBlur={() =>
                  void onCommand({
                    type: "CONFIGURE_DICE",
                    preset: "labels",
                    labels: labelText.split(",").map((s) => s.trim()),
                  })
                }
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              />
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-sky-800 px-3 py-2 text-sm font-bold text-white"
              onClick={() => void onCommand({ type: "ROLL_DICE" })}
            >
              Roll
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold"
              onClick={() => void onCommand({ type: "CLEAR_DICE" })}
            >
              Clear
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold"
              onClick={() =>
                void onCommand({
                  type: "CONFIGURE_DICE",
                  visibility: randomiser.visibility === "class" ? "teacher" : "class",
                })
              }
            >
              {randomiser.visibility === "class" ? "Public" : "Teacher only"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold"
              onClick={() =>
                void onCommand({
                  type: "CONFIGURE_DICE",
                  locked: !randomiser.locked,
                })
              }
            >
              {randomiser.locked ? "Unlock" : "Lock"}
            </button>
          </div>
        </>
      )}

      {canSeeRoll && randomiser.lastRoll && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Result</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">
            {randomiser.lastRoll.labels.join(" · ")}
          </p>
          {randomiser.lastRoll.values.length > 1 && (
            <p className="text-sm text-slate-600">Total {randomiser.lastRoll.total}</p>
          )}
        </div>
      )}

      {!canSeeRoll && randomiser.lastRoll && (
        <p className="text-xs text-slate-500">Teacher rolled privately.</p>
      )}

      {role === "host" && randomiser.history.length > 0 && (
        <ul className="max-h-20 space-y-0.5 overflow-y-auto text-xs text-slate-600">
          {randomiser.history.slice(0, 6).map((h) => (
            <li key={h.at}>
              {h.labels.join(", ")}
              {h.visibility === "teacher" ? " (private)" : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
