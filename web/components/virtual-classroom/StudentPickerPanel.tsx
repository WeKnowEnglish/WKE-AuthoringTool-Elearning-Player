"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useState } from "react";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";
import type { PickerMode } from "@/lib/classroom-tools/picker";
import { pickerPool } from "@/lib/classroom-tools/picker";

type Member = { id: string; name: string; role: string };

type Props = {
  sessionId: string;
  members: Member[];
  busy: boolean;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
};

function readPicker(root: unknown) {
  const runtime = (root as { runtime?: unknown }).runtime;
  return readLiveObjectField<{
    availableStudentIds: string[];
    pickedStudentIds: string[];
    excludedStudentIds: string[];
    currentStudentIds: string[];
    cycleNumber: number;
    includeTeacher: boolean;
    mode: PickerMode;
    history: { at: number; studentIds: string[]; mode: PickerMode }[];
  }>(runtime, "picker");
}

export function StudentPickerPanel({ sessionId, members, busy, onCommand }: Props) {
  const picker = useStorage((root) => readPicker(root));
  const [mode, setMode] = useState<PickerMode>("one");

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id.slice(0, 8);
  const students = members.filter((m) => m.role !== "host" || picker?.includeTeacher);

  if (!picker) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Sync the roster to enable the student picker.
        <button
          type="button"
          disabled={busy}
          className="mt-2 block rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
          onClick={() => void onCommand({ type: "SYNC_ROSTER" })}
        >
          Sync roster
        </button>
      </div>
    );
  }

  const remaining = pickerPool(picker);

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Student picker</h2>
          <p className="text-xs text-slate-500">
            Cycle {picker.cycleNumber} · {remaining.length} remaining · session{" "}
            {sessionId.slice(0, 10)}…
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold"
          onClick={() => void onCommand({ type: "SYNC_ROSTER", includeTeacher: picker.includeTeacher })}
        >
          Sync roster
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["one", "two", "presenter"] as PickerMode[]).map((m) => (
          <button
            key={m}
            type="button"
            disabled={busy}
            onClick={() => {
              setMode(m);
              void onCommand({ type: "SET_PICKER_MODE", mode: m });
            }}
            className={`rounded px-2 py-1 text-xs font-bold ${
              (picker.mode ?? mode) === m ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-800"
            }`}
          >
            {m === "one" ? "Pick one" : m === "two" ? "Pick two" : "Presenter"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => void onCommand({ type: "PICK" })}
        >
          Pick
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold text-slate-800"
          onClick={() => void onCommand({ type: "RESET_PICKER_CYCLE" })}
        >
          Reset cycle
        </button>
      </div>

      {picker.currentStudentIds.length > 0 && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Selected</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {picker.currentStudentIds.map(nameOf).join(" · ")}
          </p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-700">Exclude absent</p>
        <div className="mt-1 flex max-h-28 flex-wrap gap-1 overflow-y-auto">
          {students.map((s) => {
            const excluded = picker.excludedStudentIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => {
                  const next = excluded
                    ? picker.excludedStudentIds.filter((id) => id !== s.id)
                    : [...picker.excludedStudentIds, s.id];
                  void onCommand({ type: "SET_PICKER_EXCLUDED", excludedStudentIds: next });
                }}
                className={`rounded px-2 py-0.5 text-xs ${
                  excluded ? "bg-amber-200 text-amber-950 line-through" : "bg-slate-100"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {picker.history.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-700">History</p>
          <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto text-xs text-slate-600">
            {picker.history.slice(0, 8).map((h, i) => (
              <li key={`${h.at}-${i}`}>
                {h.mode}: {h.studentIds.map(nameOf).join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
