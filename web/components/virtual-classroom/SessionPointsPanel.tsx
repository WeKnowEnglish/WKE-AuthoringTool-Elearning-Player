"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";
import type { SessionPointsState } from "@/lib/virtual-classroom/tools/points";
import { createEmptySessionPoints, leaderboard } from "@/lib/virtual-classroom/tools/points";

type Member = { id: string; name: string; role: string };

type Props = {
  members: Member[];
  busy: boolean;
  role: "host" | "member";
  onCommand: (command: Record<string, unknown>) => Promise<void>;
};

function readPoints(root: unknown): SessionPointsState {
  const runtime = (root as { runtime?: unknown }).runtime;
  return (
    readLiveObjectField<SessionPointsState>(runtime, "points") ?? createEmptySessionPoints()
  );
}

export function SessionPointsPanel({ members, busy, role, onCommand }: Props) {
  const points = useStorage((root) => readPoints(root));
  const board = leaderboard(points);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id.slice(0, 8);
  const students = members.filter((m) => m.role !== "host");

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Session points</h2>
        <p className="text-xs text-slate-500">
          Live class score only — not long-term rewards or activity gold
        </p>
      </div>

      {role === "host" && (
        <>
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {students.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-slate-800">{s.name}</span>
                <div className="flex items-center gap-1">
                  <span className="w-6 text-right font-bold tabular-nums">
                    {points.totalsByStudentId[s.id] ?? 0}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded bg-teal-700 px-2 py-0.5 text-xs font-bold text-white"
                    onClick={() =>
                      void onCommand({
                        type: "AWARD_POINTS",
                        studentId: s.id,
                        delta: 1,
                        label: "point",
                      })
                    }
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded bg-sky-800 px-2 py-0.5 text-xs font-bold text-white"
                    onClick={() =>
                      void onCommand({
                        type: "AWARD_POINTS",
                        studentId: s.id,
                        delta: 1,
                        label: "participation",
                      })
                    }
                  >
                    +P
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold"
                    onClick={() =>
                      void onCommand({
                        type: "AWARD_POINTS",
                        studentId: s.id,
                        delta: -1,
                      })
                    }
                  >
                    −1
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold"
              onClick={() => void onCommand({ type: "UNDO_AWARD" })}
            >
              Undo last
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold"
              onClick={() => {
                if (window.confirm("Reset all session points?")) {
                  void onCommand({ type: "RESET_POINTS" });
                }
              }}
            >
              Reset session
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold"
              onClick={() =>
                void onCommand({
                  type: "SET_LEADERBOARD_VISIBLE",
                  showLeaderboard: !points.showLeaderboard,
                })
              }
            >
              {points.showLeaderboard ? "Hide board" : "Show board"}
            </button>
          </div>
        </>
      )}

      {points.showLeaderboard && board.length > 0 && (
        <ol className="space-y-1 text-sm text-slate-800">
          {board.slice(0, 8).map((row, i) => (
            <li key={row.studentId} className="flex justify-between gap-2">
              <span>
                {i + 1}. {nameOf(row.studentId)}
              </span>
              <span className="font-bold tabular-nums">{row.points}</span>
            </li>
          ))}
        </ol>
      )}

      {points.showLeaderboard && board.length === 0 && (
        <p className="text-xs text-slate-500">No session points yet.</p>
      )}
    </section>
  );
}
