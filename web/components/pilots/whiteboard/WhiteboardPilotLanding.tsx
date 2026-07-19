"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  getOrCreateWhiteboardUserId,
  pickStudentColor,
  setWhiteboardSessionContext,
} from "@/lib/whiteboard/liveblocks/identity";
import { WORKSHEET_PRESETS } from "@/lib/whiteboard/domain";

export function WhiteboardPilotLanding() {
  const router = useRouter();
  const [tab, setTab] = useState<"host" | "join">("host");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [title, setTitle] = useState("Draw your dream bedroom");
  const [instructions, setInstructions] = useState(
    "Use pen and text. Submit when you finish.",
  );
  const [timerMinutes, setTimerMinutes] = useState(4);
  const [worksheetPresetId, setWorksheetPresetId] = useState<string>("bedroom");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const host = async () => {
    setBusy(true);
    setError(null);
    try {
      const userId = getOrCreateWhiteboardUserId();
      const name = displayName.trim() || "Teacher";
      const response = await fetch("/api/whiteboard/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          displayName: name,
          title,
          instructions,
          timerMinutes,
          mode: "individual",
          worksheetPresetId: worksheetPresetId || null,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        roomId?: string;
      };
      if (!response.ok || !payload.sessionId || !payload.roomId) {
        throw new Error(payload.error ?? "Could not create room.");
      }
      setWhiteboardSessionContext({
        sessionId: payload.sessionId,
        roomId: payload.roomId,
        role: "host",
        displayName: name,
        color: "#0f172a",
        userId,
      });
      router.push(`/pilots/whiteboard/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Host failed.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const userId = getOrCreateWhiteboardUserId();
      const name = displayName.trim() || "Student";
      const code = joinCode.trim().toUpperCase();
      const color = pickStudentColor(userId);
      const response = await fetch("/api/whiteboard/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          displayName: name,
          joinCode: code,
          color,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        roomId?: string;
      };
      if (!response.ok || !payload.sessionId || !payload.roomId) {
        throw new Error(payload.error ?? "Could not join.");
      }
      setWhiteboardSessionContext({
        sessionId: payload.sessionId,
        roomId: payload.roomId,
        role: "player",
        displayName: name,
        color,
        userId,
      });
      router.push(`/pilots/whiteboard/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-100 via-teal-50 to-sky-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-800">
          Isolated pilot
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-nunito,Nunito)] text-4xl font-extrabold tracking-tight text-slate-900">
          Collaborative Whiteboard
        </h1>
        <p className="mt-2 text-slate-600">
          Teacher-controlled classroom boards. Free-plan pilot: 1 teacher + up to 7
          students.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("host")}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              tab === "host" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
            }`}
          >
            Host as teacher
          </button>
          <button
            type="button"
            onClick={() => setTab("join")}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${
              tab === "join" ? "bg-slate-900 text-white" : "bg-white text-slate-700"
            }`}
          >
            Join as student
          </button>
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-semibold text-slate-800">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              placeholder={tab === "host" ? "Ms. Lan" : "Minh"}
            />
          </label>

          {tab === "host" ? (
            <>
              <label className="block text-sm font-semibold text-slate-800">
                Activity title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Instructions
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Timer (minutes)
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Number(e.target.value) || 4)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <fieldset className="text-sm font-semibold text-slate-800">
                <legend>Worksheet background</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setWorksheetPresetId("")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      !worksheetPresetId ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    None
                  </button>
                  {WORKSHEET_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setWorksheetPresetId(preset.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                        worksheetPresetId === preset.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                disabled={busy}
                onClick={() => void host()}
                className="w-full rounded-xl bg-teal-700 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Creating…" : "Open teacher room"}
              </button>
            </>
          ) : (
            <>
              <label className="block text-sm font-semibold text-slate-800">
                Join code
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-normal tracking-widest"
                  placeholder="ABC123"
                  maxLength={6}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void join()}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Joining…" : "Enter whiteboard"}
              </button>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
