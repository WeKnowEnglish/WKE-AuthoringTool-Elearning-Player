"use client";

import { useMemo, useState } from "react";
import { assignAssessmentTrackAsHomework } from "@/lib/actions/class-homework";
import type { ActivityTrackDocument } from "@/lib/activity-tracks";
import {
  listAssessmentAssignIssues,
  normalizeAssessmentDefinition,
} from "@/lib/assessment";

type Props = {
  open: boolean;
  onClose: () => void;
  document: ActivityTrackDocument;
  classes: readonly { id: string; title: string }[];
  classLoadError?: boolean;
  onAssigned?: (homeworkId: string, classId: string) => void;
};

export function AssignAssessmentTrackOverlay({
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

  const readinessIssues = useMemo(() => {
    if (!document.assessmentDefinition) return [];
    return listAssessmentAssignIssues(
      normalizeAssessmentDefinition(document.assessmentDefinition),
    );
  }, [document.assessmentDefinition]);

  if (!open) return null;

  const blocked = readinessIssues.length > 0;

  const submit = async (status: "draft" | "assigned") => {
    if (blocked) {
      setError("Fix the content issues listed above before assigning.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await assignAssessmentTrackAsHomework({
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
        aria-label="Assign assessment track"
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-extrabold text-stone-900">
          Assign assessment
        </h2>
        <p className="mt-1 text-xs font-semibold text-stone-600">
          Freezes the assessment definition into class homework. Later template
          edits in Track Builder will not change this assignment.
        </p>

        {blocked ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
            <p className="font-extrabold">Fix before assign</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              {readinessIssues.slice(0, 6).map((issue) => (
                <li key={`${issue.partId}-${issue.message}`}>
                  {issue.partTitle}: {issue.message}
                </li>
              ))}
            </ul>
            {readinessIssues.length > 6 ? (
              <p className="mt-1 opacity-80">
                +{readinessIssues.length - 6} more
              </p>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 block text-xs font-bold text-stone-800">
          Class
          <select
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            disabled={classLoadError || classes.length === 0 || blocked}
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
            disabled={blocked}
            className="mt-1.5 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold"
          />
        </label>

        <label className="mt-3 block text-xs font-bold text-stone-800">
          Instructions
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={3}
            disabled={blocked}
            className="mt-1.5 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold"
          />
        </label>

        <label className="mt-3 block text-xs font-bold text-stone-800">
          Due (optional)
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={blocked}
            className="mt-1.5 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold"
          />
        </label>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || blocked || !classId}
            onClick={() => void submit("draft")}
            className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={busy || blocked || !classId}
            onClick={() => void submit("assigned")}
            className="rounded-lg border border-violet-700 bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-40"
          >
            {busy ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
