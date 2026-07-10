"use client";

import { useState, useTransition } from "react";
import { regenerateClassJoinCode } from "@/lib/actions/teacher-classes";

type Props = {
  classId: string;
  joinCode: string;
  archived: boolean;
};

export function ClassJoinCodePanel({ classId, joinCode, archived }: Props) {
  const [code, setCode] = useState(joinCode);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Copied!");
      window.setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage("Could not copy — select the code manually.");
    }
  };

  const regenerate = () => {
    startTransition(async () => {
      const result = await regenerateClassJoinCode(classId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      window.location.reload();
    });
  };

  return (
    <div className="rounded border bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-800">Class join code</h2>
      <p className="mt-1 text-sm text-neutral-600">
        Students enter this code at <span className="font-mono">/join-class</span>.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded bg-neutral-100 px-3 py-2 font-mono text-lg tracking-widest">
          {code}
        </span>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="rounded border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50"
        >
          Copy
        </button>
        {!archived ? (
          <button
            type="button"
            disabled={isPending}
            onClick={regenerate}
            className="rounded border border-neutral-300 px-3 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-50"
          >
            {isPending ? "Regenerating…" : "Regenerate code"}
          </button>
        ) : null}
      </div>
      {archived ? (
        <p className="mt-2 text-sm text-amber-800">This class is archived — new joins are disabled.</p>
      ) : null}
      {message ? <p className="mt-2 text-sm text-neutral-700">{message}</p> : null}
    </div>
  );
}
