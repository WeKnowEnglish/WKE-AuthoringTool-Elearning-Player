"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  classId: string;
  archived: boolean;
};

export function SentenceStripClassPanel({ classId, archived }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/activity/sentence-strip/class/${classId}/host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
      };
      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error ?? "Could not start sentence strip.");
      }
      router.push(`/activity/sentence-strip/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Sentence strip</h2>
        <p className="text-sm text-slate-600">
          Collaborative word-order spike on the shared activity contract. Students join at{" "}
          <code className="rounded bg-slate-100 px-1">/activity/sentence-strip/join</code>.
        </p>
      </div>
      {archived ? (
        <p className="text-sm text-amber-800">Unarchive the class to start.</p>
      ) : (
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void start()}
            className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start sentence-strip round"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      )}
    </section>
  );
}
