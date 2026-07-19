"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import { setVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";

export function VirtualClassroomJoinClient() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await diagnosticFetch(
        "/api/virtual-classroom/join",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            joinCode: joinCode.trim().toUpperCase(),
            displayName: displayName.trim() || undefined,
          }),
        },
        {
          phase: "join",
          name: "vc.join",
          detail: {
            activity: "classroom",
            commandType: "JOIN",
            sessionId: joinCode.trim().toUpperCase(),
          },
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
        joinCode?: string;
        roomId?: string;
        classId?: string | null;
        userId?: string;
        displayName?: string;
        role?: "host" | "member";
        oneOff?: boolean;
      };
      if (
        !response.ok ||
        !payload.sessionId ||
        !payload.joinCode ||
        !payload.roomId ||
        !payload.userId
      ) {
        throw new Error(payload.error ?? "Could not join.");
      }
      setVirtualClassroomContext({
        sessionId: payload.sessionId,
        joinCode: payload.joinCode,
        roomId: payload.roomId,
        classId: payload.classId ?? "",
        role: "member",
        userId: payload.userId,
        displayName: payload.displayName ?? "Student",
      });
      router.push(`/virtual-classroom/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">Join Virtual Classroom</h1>
      <p className="text-slate-600">
        Enter the session code from your teacher. Class sessions need a signed-in enrolled student;
        one-off sessions only need a display name.
      </p>
      <label className="text-sm font-semibold text-slate-800">
        Session code
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-widest"
          placeholder="ABC234"
        />
      </label>
      <label className="text-sm font-semibold text-slate-800">
        Display name
        <span className="ml-1 font-normal text-slate-500">(for one-off / guest joins)</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="Sam"
        />
      </label>
      <button
        type="button"
        disabled={busy || joinCode.trim().length < 4}
        onClick={() => void join()}
        className="rounded-xl bg-teal-800 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Joining…" : "Enter classroom"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
