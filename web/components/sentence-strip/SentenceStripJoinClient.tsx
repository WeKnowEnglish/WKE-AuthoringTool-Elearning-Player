"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SentenceStripJoinClient() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/activity/sentence-strip/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      });
      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
      };
      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error ?? "Could not join.");
      }
      router.push(`/activity/sentence-strip/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold text-slate-900">Join sentence strip</h1>
      <p className="text-sm text-slate-600">Enter the code from your teacher. You must be signed in.</p>
      <label className="text-sm font-semibold text-slate-800">
        Join code
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-widest"
          maxLength={6}
        />
      </label>
      <button
        type="button"
        disabled={busy || joinCode.trim().length < 4}
        onClick={() => void join()}
        className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
