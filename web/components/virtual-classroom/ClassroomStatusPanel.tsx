"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useState } from "react";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";
import type {
  ClassroomStatusKind,
  ClassroomStatusState,
} from "@/lib/virtual-classroom/tools/status";
import {
  countByStatus,
  createEmptyClassroomStatus,
} from "@/lib/virtual-classroom/tools/status";

type Member = { id: string; name: string; role: string };

type Props = {
  members: Member[];
  userId: string;
  role: "host" | "member";
  busy: boolean;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
};

const STATUS_OPTIONS: { id: ClassroomStatusKind; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "help", label: "Help" },
  { id: "hand", label: "Hand up" },
  { id: "finished", label: "Finished" },
  { id: "away", label: "Away" },
  { id: "none", label: "Clear" },
];

function readStatus(root: unknown): ClassroomStatusState {
  const runtime = (root as { runtime?: unknown }).runtime;
  return (
    readLiveObjectField<ClassroomStatusState>(runtime, "classroomStatus") ??
    createEmptyClassroomStatus()
  );
}

export function ClassroomStatusPanel({
  members,
  userId,
  role,
  busy,
  onCommand,
}: Props) {
  const status = useStorage((root) => readStatus(root));
  const [announce, setAnnounce] = useState("");
  const counts = countByStatus(status);
  const mine = status.byStudentId[userId] ?? "none";
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id.slice(0, 8);

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Status</h2>
        <p className="text-xs text-slate-500">
          Ready · Help · Hand · Finished
          {status.interactionFrozen ? " · frozen" : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={busy}
            className={`rounded px-2 py-1 text-xs font-bold ${
              mine === opt.id ? "bg-teal-800 text-white" : "bg-slate-100"
            }`}
            onClick={() =>
              void onCommand({
                type: "SET_OWN_STATUS",
                studentId: userId,
                status: opt.id,
              })
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {role === "host" && (
        <>
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-700">
            <span>Ready {counts.ready}</span>
            <span>Help {counts.help}</span>
            <span>Hand {counts.hand}</span>
            <span>Done {counts.finished}</span>
            <span>Away {counts.away}</span>
          </div>

          <ul className="max-h-28 space-y-0.5 overflow-y-auto text-xs text-slate-700">
            {Object.entries(status.byStudentId).map(([id, kind]) => (
              <li key={id} className="flex justify-between gap-2">
                <span className="truncate">{nameOf(id)}</span>
                <span className="font-semibold capitalize">{kind}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold"
              onClick={() => void onCommand({ type: "CLEAR_STATUSES" })}
            >
              Clear all
            </button>
            <button
              type="button"
              disabled={busy}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                status.interactionFrozen
                  ? "bg-amber-600 text-white"
                  : "bg-slate-200 text-slate-900"
              }`}
              onClick={() =>
                void onCommand({
                  type: "SET_FREEZE",
                  frozen: !status.interactionFrozen,
                })
              }
            >
              {status.interactionFrozen ? "Unfreeze class" : "Freeze interaction"}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={announce}
              onChange={(e) => setAnnounce(e.target.value)}
              placeholder="Announcement…"
              maxLength={280}
              className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              disabled={busy || !announce.trim()}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
              onClick={() => {
                void onCommand({ type: "SET_ANNOUNCEMENT", message: announce });
                setAnnounce("");
              }}
            >
              Send
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold"
              onClick={() => void onCommand({ type: "SET_ANNOUNCEMENT", message: null })}
            >
              Clear
            </button>
          </div>
        </>
      )}

      {role === "member" && status.interactionFrozen && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          The teacher has frozen interaction. Wait for the next instruction.
        </p>
      )}
    </section>
  );
}
