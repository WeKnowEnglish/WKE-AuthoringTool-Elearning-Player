"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { assignStudioActivityAsHomework } from "@/lib/actions/class-homework";
import {
  assignableStudioHomeworkFormatLabel,
  isAssignableStudioHomeworkFormat,
} from "@/lib/class-homework/assignable-studio-formats";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

type ClassOption = {
  id: string;
  title: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  activityId: string;
  activityTitle: string;
  format: StudioActivityFormat;
  classes: readonly ClassOption[];
};

export function AssignStudioActivityHomeworkOverlay({
  open,
  onClose,
  activityId,
  activityTitle,
  format,
  classes,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const defaultClassId = useMemo(() => classes[0]?.id ?? "", [classes]);
  const assignable = isAssignableStudioHomeworkFormat(format);
  const formatLabel = assignableStudioHomeworkFormatLabel(format);

  const [classId, setClassId] = useState(defaultClassId);
  const [title, setTitle] = useState(activityTitle);
  const [instructions, setInstructions] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    classId: string;
    status: "draft" | "assigned";
    homeworkTitle: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setClassId(defaultClassId);
    setTitle(activityTitle);
    setInstructions("");
    setDueLocal("");
    setError(null);
    setSuccess(null);
    setBusy(false);
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, activityId, activityTitle, defaultClassId]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  async function submit(status: "draft" | "assigned") {
    setError(null);
    setBusy(true);
    try {
      const result = await assignStudioActivityAsHomework({
        activityId,
        classId,
        title,
        instructions,
        dueAt: dueLocal ? new Date(dueLocal).toISOString() : null,
        status,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess({
        classId: result.homework.classId,
        status: result.homework.status === "assigned" ? "assigned" : "draft",
        homeworkTitle: result.homework.title,
      });
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-neutral-900">
              Assign as homework
            </h2>
            <p className="mt-0.5 truncate text-sm text-neutral-600" title={activityTitle}>
              {activityTitle}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Activity Bank · {formatLabel}
              {!assignable ? " · Not assignable yet" : ""}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-4">
          {success ? (
            <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
              <p className="font-semibold">
                {success.status === "assigned" ? "Assigned" : "Saved as draft"}:{" "}
                {success.homeworkTitle}
              </p>
              <p className="text-xs text-emerald-900/90">
                {success.status === "assigned"
                  ? "Students in this class see it on Primary → Today’s Learning."
                  : "Open the class homework panel to assign when ready."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/teacher/classes/${success.classId}`}
                  className="rounded bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Open class
                </Link>
                <button
                  type="button"
                  className="rounded border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {!assignable ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  Vocabulary lists can’t be assigned as homework yet. Compile a quiz or
                  learning track first, or use a homework module workspace.
                </p>
              ) : null}

              {classes.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  Create a private class first, then assign homework.
                </p>
              ) : (
                <>
                  <label className="block text-sm font-semibold text-neutral-900">
                    Class
                    <select
                      value={classId}
                      disabled={busy || !assignable}
                      onChange={(event) => setClassId(event.target.value)}
                      className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm font-normal"
                    >
                      {classes.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-semibold text-neutral-900">
                    Homework title
                    <input
                      value={title}
                      disabled={busy || !assignable}
                      onChange={(event) => setTitle(event.target.value)}
                      className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm font-normal"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-neutral-900">
                    Instructions (optional)
                    <textarea
                      value={instructions}
                      disabled={busy || !assignable}
                      onChange={(event) => setInstructions(event.target.value)}
                      rows={2}
                      className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm font-normal"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-neutral-900">
                    Due (optional)
                    <input
                      type="datetime-local"
                      value={dueLocal}
                      disabled={busy || !assignable}
                      onChange={(event) => setDueLocal(event.target.value)}
                      className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm font-normal"
                    />
                  </label>

                  <p className="text-xs text-neutral-500">
                    Students get a frozen copy. Editing the bank activity later won’t change this
                    homework.
                  </p>
                </>
              )}

              {error ? <p className="text-sm text-red-700">{error}</p> : null}
            </>
          )}
        </div>

        {!success ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-neutral-100 px-4 py-3">
            <button
              type="button"
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              disabled={busy || !assignable || classes.length === 0 || !classId}
              onClick={() => void submit("draft")}
            >
              Save draft
            </button>
            <button
              type="button"
              className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              disabled={busy || !assignable || classes.length === 0 || !classId}
              onClick={() => void submit("assigned")}
            >
              {busy ? "Assigning…" : "Assign now"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
