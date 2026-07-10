"use client";

import { useState, useTransition } from "react";
import { archiveTeacherClass } from "@/lib/actions/teacher-classes";

type Props = {
  classId: string;
  archived: boolean;
};

export function ArchiveClassButton({ classId, archived }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (archived) {
    return <p className="text-sm font-semibold text-amber-800">Archived — students cannot join with the code.</p>;
  }

  const archive = () => {
    if (!window.confirm("Archive this class? Students will not be able to join with the code.")) return;
    startTransition(async () => {
      const result = await archiveTeacherClass(classId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  };

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={archive}
        className="rounded border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50"
      >
        {isPending ? "Archiving…" : "Archive class"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
