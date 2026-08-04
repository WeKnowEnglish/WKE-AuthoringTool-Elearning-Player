"use client";

import { useState } from "react";
import { assignGradedTrackAsHomework } from "@/lib/actions/class-homework";
import type { ActivityTrackDocument } from "@/lib/activity-tracks";

type Props = {
  open: boolean;
  onClose: () => void;
  document: ActivityTrackDocument;
  classes: readonly { id: string; title: string }[];
  classLoadError?: boolean;
  onAssigned?: (homeworkId: string, classId: string) => void;
};

export function AssignGradedTrackOverlay({
  open,
  onClose,
  document,
  classes,
  classLoadError = false,
  onAssigned,
}: Props) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [title, setTitle] = useState(document.title);
  const [instructions, setInstructions] = useState(document.instructions);
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (status: "draft" | "assigned") => {
    setBusy(true);
    setError(null);
    const result = await assignGradedTrackAsHomework({
      document,
      classId,
      title,
      instructions,
      dueAt: dueAt || null,
      status,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onAssigned?.(result.homework.id, classId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Assign graded track"
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-extrabold text-stone-900">Assign graded track</h2>
        <p className="mt-1 text-xs font-semibold text-stone-600">
          Freezes the cloned template content into class homework. Later template code
          changes will not affect this assignment.
        </p>

        <label className="mt-4 block text-xs font-bold text-stone-800">
          Class
          <select
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            disabled={classLoadError || classes.length === 0}
            className="mt-1.5 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold"
          >
            {classes.length === 0 ? (
              <option value="">No classes available</option>
            ) : (
              classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="mt-3 block text-xs font-bold text-stone-800">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold"
          />
        </label>

        <label className="mt-3 block text-xs font-bold text-stone-800">
          Instructions
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold"
          />
        </label>

        <label className="mt-3 block text-xs font-bold text-stone-800">
          Due (optional)
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold"
          />
        </label>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            {error}
          </p>
        ) : null}
        {classLoadError ? (
          <p className="mt-3 text-xs font-semibold text-amber-800">
            Classes could not be loaded. Refresh and try again.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !classId || classes.length === 0}
            onClick={() => void submit("assigned")}
            className="inline-flex min-h-10 items-center rounded-lg bg-amber-600 px-4 text-xs font-bold text-white disabled:opacity-40"
          >
            Assign now
          </button>
          <button
            type="button"
            disabled={busy || !classId || classes.length === 0}
            onClick={() => void submit("draft")}
            className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3 text-xs font-bold text-stone-800 disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-bold text-stone-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
