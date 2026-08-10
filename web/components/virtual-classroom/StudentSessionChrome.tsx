"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useState } from "react";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";
import type { ClassroomStatusKind } from "@/lib/virtual-classroom/tools/status";
import type { RandomiserState } from "@/lib/virtual-classroom/tools/dice";
import { createEmptyRandomiser } from "@/lib/virtual-classroom/tools/dice";
import {
  createEmptySessionPoints,
  leaderboard,
  type SessionPointsState,
} from "@/lib/virtual-classroom/tools/points";

type Props = {
  userId: string;
  members: { id: string; name: string }[];
  busy: boolean;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
  realtimeRandomiser?: RandomiserState | null;
};

const QUICK: { id: ClassroomStatusKind; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "help", label: "Help" },
  { id: "hand", label: "Hand" },
  { id: "finished", label: "Done" },
];

export function StudentSessionChrome({
  userId,
  members,
  busy,
  onCommand,
  realtimeRandomiser,
}: Props) {
  const [mine, setMine] = useState<ClassroomStatusKind>("none");
  const liveblocksRandomiser = useStorage((root) => {
    const runtime = (root as { runtime?: unknown }).runtime;
    return (
      readLiveObjectField<RandomiserState>(runtime, "randomiser") ?? createEmptyRandomiser()
    );
  });
  const randomiser = realtimeRandomiser ?? liveblocksRandomiser;
  const points = useStorage((root) => {
    const runtime = (root as { runtime?: unknown }).runtime;
    return (
      readLiveObjectField<SessionPointsState>(runtime, "points") ?? createEmptySessionPoints()
    );
  });
  const myStatus = useStorage((root) => {
    const runtime = (root as { runtime?: unknown }).runtime;
    const status = readLiveObjectField<{ byStudentId?: Record<string, ClassroomStatusKind> }>(
      runtime,
      "classroomStatus",
    );
    return status?.byStudentId?.[userId] ?? "none";
  });

  const current = myStatus !== "none" ? myStatus : mine;
  const board = points.showLeaderboard ? leaderboard(points).slice(0, 3) : [];
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id.slice(0, 8);
  const canSeeRoll =
    randomiser.visibility === "class" &&
    randomiser.lastRoll &&
    randomiser.lastRoll.visibility === "class";

  return (
    <div className="space-y-3">
      {canSeeRoll && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">Dice</p>
          <p className="text-xl font-extrabold text-slate-900">
            {randomiser.lastRoll!.labels.join(" · ")}
          </p>
        </div>
      )}

      {board.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Session points
          </p>
          <ol className="mt-1 space-y-0.5 text-sm text-slate-800">
            {board.map((row, i) => (
              <li key={row.studentId} className="flex justify-between gap-2">
                <span>
                  {i + 1}. {nameOf(row.studentId)}
                </span>
                <span className="font-bold tabular-nums">{row.points}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Your status
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={busy}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                current === opt.id ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-800"
              }`}
              onClick={() => {
                setMine(opt.id);
                void onCommand({
                  type: "SET_OWN_STATUS",
                  studentId: userId,
                  status: opt.id,
                });
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
