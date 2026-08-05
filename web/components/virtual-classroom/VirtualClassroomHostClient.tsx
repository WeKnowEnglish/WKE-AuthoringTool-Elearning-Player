"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CollabDiagnosticsPanel } from "@/components/collab-diagnostics/CollabDiagnosticsPanel";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import { setVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";

export function VirtualClassroomHostClient() {
  const router = useRouter();
  const [title, setTitle] = useState("One-off Virtual Classroom");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await diagnosticFetch(
        "/api/virtual-classroom/host",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim() || "One-off Virtual Classroom",
            classId: null,
          }),
        },
        {
          phase: "classroom",
          name: "vc.host",
          detail: { activity: "classroom", commandType: "HOST" },
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
      };
      if (
        !response.ok ||
        !payload.sessionId ||
        !payload.joinCode ||
        !payload.roomId ||
        !payload.userId
      ) {
        throw new Error(payload.error ?? "Could not start Virtual Classroom.");
      }
      setVirtualClassroomContext({
        sessionId: payload.sessionId,
        joinCode: payload.joinCode,
        roomId: payload.roomId,
        classId: payload.classId ?? "",
        role: "host",
        userId: payload.userId,
        displayName: payload.displayName ?? "Teacher",
        returnHref: "/teacher/virtual-classroom/host",
      });
      router.push(`/teacher/virtual-classroom/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4 py-10">
      <CollabDiagnosticsPanel activity="classroom" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
          Virtual Classroom
        </p>
        <h1 className="text-3xl font-extrabold text-slate-900">Host a live session</h1>
        <p className="mt-2 text-slate-600">
          Start a one-off session to stress-test tools with guest students (no class enrollment).
          For a real class, open a class page and use{" "}
          <span className="font-semibold">Start Virtual Classroom</span> there.
        </p>
      </div>

      <label className="text-sm font-semibold text-slate-800">
        Session title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={() => void start()}
        className="rounded-xl bg-teal-800 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start one-off Virtual Classroom"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-slate-500">
        Students join at <code className="rounded bg-slate-100 px-1">/virtual-classroom/join</code>{" "}
        with a display name — no account required for one-off sessions.
      </p>
    </div>
  );
}
