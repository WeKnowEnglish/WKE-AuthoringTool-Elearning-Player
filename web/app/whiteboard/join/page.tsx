"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setWhiteboardSessionContext } from "@/lib/whiteboard/liveblocks/identity";

export default function WhiteboardProductJoinPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/whiteboard/product-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      });
      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        roomId?: string;
        userId?: string;
        displayName?: string;
        roomStrategy?: "single_room" | "per_board_rooms";
        boardRoomId?: string | null;
      };
      if (!response.ok || !payload.sessionId || !payload.roomId || !payload.userId) {
        throw new Error(payload.error ?? "Could not join.");
      }
      setWhiteboardSessionContext({
        sessionId: payload.sessionId,
        roomId: payload.roomId,
        role: "player",
        displayName: payload.displayName ?? "Student",
        color: "#0f766e",
        userId: payload.userId,
        roomStrategy: payload.roomStrategy,
        boardRoomId: payload.boardRoomId ?? null,
      });
      router.push(`/whiteboard/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">Join whiteboard</h1>
      <p className="text-slate-600">
        Sign in as a class student, then enter the code from your teacher.
      </p>
      <label className="text-sm font-semibold text-slate-800">
        Join code
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-widest"
          placeholder="ABC123"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void join()}
        className="rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Joining…" : "Enter board"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">
        Guest pilot remains at <code>/pilots/whiteboard</code>.
      </p>
    </div>
  );
}
