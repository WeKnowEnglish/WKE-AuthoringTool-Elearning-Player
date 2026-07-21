"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { assignPackQuizAsHomework } from "@/lib/actions/class-homework";
import type { PackQuizFormat } from "@/lib/vocabulary/pack-quiz";

type ClassOption = {
  id: string;
  title: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  quizId: string;
  quizTitle: string;
  questionCount: number;
  format: PackQuizFormat;
  packId: string | null;
  packClassId: string | null;
  classes: readonly ClassOption[];
};

function defaultLinkPack(packClassId: string | null, selectedClassId: string): boolean {
  if (!packClassId) return true;
  if (packClassId === selectedClassId) return false;
  return false;
}

export function AssignPackQuizHomeworkOverlay({
  open,
  onClose,
  quizId,
  quizTitle,
  questionCount,
  format,
  packId,
  packClassId,
  classes,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const defaultClassId = useMemo(() => {
    if (packClassId && classes.some((c) => c.id === packClassId)) return packClassId;
    return classes[0]?.id ?? "";
  }, [classes, packClassId]);

  const [classId, setClassId] = useState(defaultClassId);
  const [title, setTitle] = useState(quizTitle);
  const [instructions, setInstructions] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [linkPack, setLinkPack] = useState(() => defaultLinkPack(packClassId, defaultClassId));
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
    setTitle(quizTitle);
    setInstructions("");
    setDueLocal("");
    setLinkPack(defaultLinkPack(packClassId, defaultClassId));
    setError(null);
    setSuccess(null);
    setBusy(false);
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, quizId, quizTitle, defaultClassId, packClassId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
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

  const selectedClass = classes.find((c) => c.id === classId) ?? null;
  const packLinkedHere = Boolean(packClassId && packClassId === classId);
  const packLinkedElsewhere = Boolean(packClassId && packClassId !== classId);
  const otherClassTitle = packLinkedElsewhere
    ? classes.find((c) => c.id === packClassId)?.title ?? "another class"
    : null;

  function onClassChange(nextClassId: string) {
    setClassId(nextClassId);
    setLinkPack(defaultLinkPack(packClassId, nextClassId));
  }

  async function submit(status: "draft" | "assigned") {
    setError(null);
    setBusy(true);
    try {
      const result = await assignPackQuizAsHomework({
        quizId,
        classId,
        title,
        instructions,
        dueAt: dueLocal ? new Date(dueLocal).toISOString() : null,
        status,
        linkPackToClass: Boolean(packId && linkPack),
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
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-neutral-900">
              Assign activity as homework
            </h2>
            <p className="mt-0.5 truncate text-sm text-neutral-600" title={quizTitle}>
              {quizTitle}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Pack quiz · {questionCount} question{questionCount === 1 ? "" : "s"}
              {format !== "multiple_choice"
                ? " · Only multiple choice plays for students today"
                : ""}
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
                  ? "Students in this class see it on Primary → Assigned."
                  : "Not visible to students until you assign it from the class hub."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/teacher/classes/${success.classId}`}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  Open class homework
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-emerald-700 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-100/60"
                >
                  Done
                </button>
              </div>
            </div>
          ) : classes.length === 0 ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Create a class first, then assign this quiz.
            </p>
          ) : questionCount < 1 ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              This quiz has no questions, so it can’t be assigned yet.
            </p>
          ) : (
            <>
              <label className="block text-sm font-semibold text-neutral-800">
                Class
                <select
                  value={classId}
                  disabled={busy}
                  onChange={(e) => onClassChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>

              {packId ? (
                <div className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                  {packLinkedHere ? (
                    <p>Pack is linked to {selectedClass?.title ?? "this class"}.</p>
                  ) : packLinkedElsewhere ? (
                    <p>
                      Pack is currently linked to {otherClassTitle}. Assigning here won’t move it
                      unless you check Link below.
                    </p>
                  ) : (
                    <p>
                      This pack isn’t linked to a class yet — required for the class Homework quiz
                      list.
                    </p>
                  )}
                  {!packLinkedHere ? (
                    <label className="mt-2 flex items-start gap-2 font-semibold text-neutral-800">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={linkPack}
                        disabled={busy}
                        onChange={(e) => setLinkPack(e.target.checked)}
                      />
                      <span>Link pack to {selectedClass?.title ?? "this class"}</span>
                    </label>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-amber-800">
                  This quiz has no source pack — students can still play if assigned, but it won’t
                  appear in the class quiz dropdown.
                </p>
              )}

              <label className="block text-sm font-semibold text-neutral-800">
                Title
                <input
                  value={title}
                  disabled={busy}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
                />
              </label>

              <label className="block text-sm font-semibold text-neutral-800">
                Instructions
                <textarea
                  value={instructions}
                  disabled={busy}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
                />
              </label>

              <label className="block text-sm font-semibold text-neutral-800">
                Due
                <input
                  type="datetime-local"
                  value={dueLocal}
                  disabled={busy}
                  onChange={(e) => setDueLocal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
                />
              </label>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </>
          )}
        </div>

        {!success && classes.length > 0 && questionCount >= 1 ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-neutral-100 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !classId}
              onClick={() => void submit("draft")}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save as draft"}
            </button>
            <button
              type="button"
              disabled={busy || !classId}
              onClick={() => void submit("assigned")}
              className="rounded bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {busy ? "Assigning…" : "Assign now"}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
