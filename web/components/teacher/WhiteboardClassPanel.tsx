"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WORKSHEET_PRESETS } from "@/lib/whiteboard/domain";
import { setWhiteboardSessionContext } from "@/lib/whiteboard/liveblocks/identity";

type Props = {
  classId: string;
  archived: boolean;
  /** Denser layout for the sticky teacher toolkit. */
  compact?: boolean;
};

export function WhiteboardClassPanel({
  classId,
  archived,
  compact = false,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("Draw your dream bedroom");
  const [instructions, setInstructions] = useState(
    "Use pen, shapes, and stamps. Submit when finished.",
  );
  const [timerMinutes, setTimerMinutes] = useState(4);
  const [worksheetPresetId, setWorksheetPresetId] = useState("bedroom");
  const [groupPolicy, setGroupPolicy] = useState<
    "any_member" | "leader_only" | "everyone_ready"
  >("any_member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/whiteboard/class/${classId}/host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          instructions,
          timerMinutes,
          worksheetPresetId: worksheetPresetId || null,
          groupSubmitPolicy: groupPolicy,
          mode: "individual",
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        roomId?: string;
        userId?: string;
        displayName?: string;
        roomStrategy?: "single_room" | "per_board_rooms";
        controlRoomId?: string | null;
        boardRoomIds?: string[];
      };
      if (
        !response.ok ||
        !payload.sessionId ||
        !payload.roomId ||
        !payload.userId
      ) {
        throw new Error(payload.error ?? "Could not start whiteboard.");
      }
      setWhiteboardSessionContext({
        sessionId: payload.sessionId,
        roomId: payload.roomId,
        role: "host",
        displayName: payload.displayName ?? "Teacher",
        color: "#0f172a",
        userId: payload.userId,
        roomStrategy: payload.roomStrategy,
        controlRoomId: payload.controlRoomId ?? null,
        boardRoomId: payload.boardRoomIds?.[0] ?? null,
      });
      router.push(`/teacher/whiteboard/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = compact
    ? "mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 font-normal text-sm"
    : "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal";
  const labelClass = compact
    ? "block text-[11px] font-semibold text-stone-800"
    : "block text-sm font-semibold text-slate-800";

  return (
    <section
      className={
        compact
          ? "space-y-2"
          : "space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      {!compact ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Whiteboard activity (standalone)
          </h2>
          <p className="text-sm text-slate-600">
            Prefer starting a{" "}
            <span className="font-semibold">Virtual Classroom</span> session above,
            then launching whiteboard from inside it. Standalone rounds still work
            via{" "}
            <code className="rounded bg-slate-100 px-1">/whiteboard/join</code>.
          </p>
        </div>
      ) : null}

      {archived ? (
        <p className={`text-amber-800 ${compact ? "text-[11px]" : "text-sm"}`}>
          Unarchive the class to start a whiteboard.
        </p>
      ) : (
        <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-2"}>
          <label className={labelClass}>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Timer (minutes)
            <input
              type="number"
              min={1}
              max={30}
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(Number(e.target.value) || 4)}
              className={fieldClass}
            />
          </label>
          <label className={`${labelClass} ${compact ? "" : "sm:col-span-2"}`}>
            Instructions
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              className={fieldClass}
            />
          </label>
          <fieldset className={labelClass}>
            <legend>Worksheet</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setWorksheetPresetId("")}
                className={`rounded px-2 py-1 text-xs ${
                  !worksheetPresetId ? "bg-stone-900 text-white" : "bg-stone-100"
                }`}
              >
                None
              </button>
              {WORKSHEET_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setWorksheetPresetId(p.id)}
                  className={`rounded px-2 py-1 text-xs ${
                    worksheetPresetId === p.id
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className={labelClass}>
            Group submit policy
            <select
              value={groupPolicy}
              onChange={(e) =>
                setGroupPolicy(e.target.value as typeof groupPolicy)
              }
              className={fieldClass}
            >
              <option value="any_member">Any member</option>
              <option value="leader_only">Leader only</option>
              <option value="everyone_ready">Everyone ready</option>
            </select>
          </label>
          <div className={compact ? "" : "sm:col-span-2"}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void start()}
              className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 sm:text-sm"
            >
              {busy ? "Starting…" : "Start whiteboard round"}
            </button>
            {error ? (
              <p
                className={`mt-2 text-red-600 ${compact ? "text-[11px]" : "text-sm"}`}
              >
                {error}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
