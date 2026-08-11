"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useState } from "react";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";
import type { GroupSetState, GroupSizeMode } from "@/lib/virtual-classroom/tools/groups";

type Member = { id: string; name: string; role: string };

type Props = {
  sessionId: string;
  members: Member[];
  busy: boolean;
  hasWhiteboardActivity: boolean;
  hasDocumentActivity: boolean;
  hasWordCardsActivity: boolean;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
  groupSet?: GroupSetState | null;
};

function readGroupSet(root: unknown): GroupSetState | null {
  const runtime = (root as { runtime?: unknown }).runtime;
  return readLiveObjectField<GroupSetState>(runtime, "groupSet") ?? null;
}

export function GroupMakerPanel(props: Props) {
  const liveblocksGroupSet = useStorage((root) => readGroupSet(root));
  return <GroupMakerPanelContent {...props} groupSet={props.groupSet ?? liveblocksGroupSet} />;
}

export function GroupMakerPanelContent({
  sessionId,
  members,
  busy,
  hasWhiteboardActivity,
  hasDocumentActivity,
  hasWordCardsActivity,
  onCommand,
  groupSet,
}: Omit<Props, "groupSet"> & { groupSet: GroupSetState | null }) {
  const [sizeMode, setSizeMode] = useState<GroupSizeMode>("pairs");
  const [targetCount, setTargetCount] = useState(3);
  const [moveStudentId, setMoveStudentId] = useState("");

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id.slice(0, 8);

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Group maker</h2>
        <p className="text-xs text-slate-500">
          Session-level groups · {sessionId.slice(0, 10)}… · send into whiteboard or document when
          live
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["pairs", "Pairs"],
            ["3", "Groups of 3"],
            ["4", "Groups of 4"],
            ["5", "Groups of 5"],
            ["n_groups", "N groups"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            onClick={() => setSizeMode(value)}
            className={`rounded px-2 py-1 text-xs font-bold ${
              sizeMode === value ? "bg-sky-800 text-white" : "bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sizeMode === "n_groups" && (
        <label className="block text-xs font-semibold text-slate-700">
          Number of groups
          <input
            type="number"
            min={2}
            max={12}
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value) || 2)}
            className="mt-1 w-24 rounded border border-slate-300 px-2 py-1"
          />
        </label>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-sky-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          onClick={() =>
            void onCommand({
              type: "GENERATE_GROUPS",
              sizeMode,
              targetGroupCount: sizeMode === "n_groups" ? targetCount : null,
            })
          }
        >
          Generate
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold"
          onClick={() => void onCommand({ type: "SHUFFLE_GROUPS" })}
        >
          Shuffle
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold"
          onClick={() => void onCommand({ type: "SAVE_GROUPS" })}
        >
          Save set
        </button>
        <button
          type="button"
          disabled={busy || !groupSet?.previousGroups?.length}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-40"
          onClick={() => void onCommand({ type: "RESTORE_GROUPS" })}
        >
          Restore
        </button>
        <button
          type="button"
          disabled={busy || !hasWhiteboardActivity || !groupSet?.groups?.length}
          className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
          onClick={() => void onCommand({ type: "SEND_GROUPS_TO_WHITEBOARD" })}
        >
          Send to whiteboard
        </button>
        <button
          type="button"
          disabled={busy || !hasDocumentActivity || !groupSet?.groups?.length}
          className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
          onClick={() => void onCommand({ type: "SEND_GROUPS_TO_DOCUMENT" })}
        >
          Send to document
        </button>
        <button
          type="button"
          disabled={busy || !hasWordCardsActivity || !groupSet?.groups?.length}
          className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
          onClick={() => void onCommand({ type: "SEND_GROUPS_TO_WORD_CARDS" })}
        >
          Send to word cards
        </button>
      </div>

      {!hasWhiteboardActivity && !hasDocumentActivity && !hasWordCardsActivity && (
        <p className="text-xs text-amber-800">
          Start a whiteboard, document, or word cards activity to send groups into it.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {(groupSet?.groups ?? []).map((g) => (
          <div
            key={g.id}
            className="rounded-lg border border-slate-200 p-2"
            style={{ borderLeftWidth: 4, borderLeftColor: g.color }}
          >
            <div className="flex items-center justify-between gap-1">
              <input
                value={g.name}
                disabled={busy}
                onChange={(e) =>
                  void onCommand({ type: "RENAME_GROUP", groupId: g.id, name: e.target.value })
                }
                className="w-full rounded border border-transparent bg-transparent text-sm font-bold text-slate-900 hover:border-slate-300"
              />
              <button
                type="button"
                disabled={busy}
                className="text-[10px] font-semibold text-slate-500"
                onClick={() => void onCommand({ type: "TOGGLE_GROUP_LOCK", groupId: g.id })}
              >
                {g.locked ? "Locked" : "Lock"}
              </button>
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
              {g.memberIds.map((id) => (
                <li key={id} className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => setMoveStudentId(id)}
                  >
                    {nameOf(id)}
                    {g.leaderId === id ? " ★" : ""}
                  </button>
                  {g.leaderId !== id && (
                    <button
                      type="button"
                      disabled={busy}
                      className="text-[10px] text-sky-800"
                      onClick={() =>
                        void onCommand({
                          type: "SET_GROUP_LEADER",
                          groupId: g.id,
                          leaderId: id,
                        })
                      }
                    >
                      Leader
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {moveStudentId && !g.locked && (
              <button
                type="button"
                disabled={busy}
                className="mt-1 text-[10px] font-bold text-teal-800"
                onClick={() => {
                  void onCommand({
                    type: "MOVE_STUDENT",
                    studentId: moveStudentId,
                    toGroupId: g.id,
                  }).then(() => setMoveStudentId(""));
                }}
              >
                Move {nameOf(moveStudentId)} here
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
