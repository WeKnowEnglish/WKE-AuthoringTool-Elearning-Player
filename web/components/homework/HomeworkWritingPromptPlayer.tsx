"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentActionFailureNotice } from "@/components/homework/StudentActionFailureNotice";
import { saveHomeworkWritingSubmission } from "@/lib/actions/homework-writing-submission";
import {
  isStudentActionAuthFailure,
  type StudentActionAuthFailure,
} from "@/lib/auth/student-action-auth";
import { countWritingWords } from "@/lib/class-homework/normalize";
import type { HomeworkWritingSubmission } from "@/lib/data/homework-writing-submissions";
import {
  clearHomeworkWritingDraft,
  readHomeworkWritingDraft,
  writeHomeworkWritingDraft,
} from "@/lib/homework-writing/draft-storage";

type Props = {
  homeworkId: string;
  studentId: string;
  prompt: string;
  payloadInstructions?: string;
  minWords?: number;
  alreadyCompleted: boolean;
  initialSubmission: HomeworkWritingSubmission | null;
  homeHref?: string;
  homeLabel?: string;
};

export function HomeworkWritingPromptPlayer({
  homeworkId,
  studentId,
  prompt,
  payloadInstructions,
  minWords = 0,
  alreadyCompleted,
  initialSubmission,
  homeHref = "/primary",
  homeLabel = "Back to Home",
}: Props) {
  const [text, setText] = useState(initialSubmission?.text ?? "");
  const [status, setStatus] = useState<"in_progress" | "submitted">(
    initialSubmission?.status === "submitted" || alreadyCompleted ? "submitted" : "in_progress",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authFailure, setAuthFailure] = useState<{
    failure: StudentActionAuthFailure;
    action: "save_draft" | "submit";
  } | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(initialSubmission?.updatedAt ?? null);

  useEffect(() => {
    const applyRecoveredDraft = () => {
      const submitted = initialSubmission?.status === "submitted" || alreadyCompleted;
      if (submitted) {
        clearHomeworkWritingDraft(studentId, homeworkId);
        setText(initialSubmission?.text ?? "");
        setStatus("submitted");
        setSavedAt(initialSubmission?.updatedAt ?? null);
        setRecoveryNotice(null);
        return;
      }

      const localDraft = readHomeworkWritingDraft(studentId, homeworkId);
      const serverUpdatedAt = Date.parse(initialSubmission?.updatedAt ?? "");
      const localUpdatedAt = Date.parse(localDraft?.updatedAt ?? "");
      if (
        localDraft?.text &&
        (!initialSubmission?.text ||
          !Number.isFinite(serverUpdatedAt) ||
          (Number.isFinite(localUpdatedAt) && localUpdatedAt > serverUpdatedAt))
      ) {
        setText(localDraft.text);
        setSavedAt(localDraft.updatedAt);
        setRecoveryNotice("We restored writing that was kept safely on this device.");
      } else {
        setText(initialSubmission?.text ?? "");
        setSavedAt(initialSubmission?.updatedAt ?? null);
        setRecoveryNotice(null);
      }
      setStatus("in_progress");
    };

    const timeoutId = window.setTimeout(applyRecoveredDraft, 0);
    return () => window.clearTimeout(timeoutId);
  }, [alreadyCompleted, homeworkId, initialSubmission, studentId]);

  const wordCount = countWritingWords(text);
  const canSubmit = text.trim().length > 0 && (minWords <= 0 || wordCount >= minWords);
  const locked = status === "submitted";

  async function persist(submit: boolean) {
    setSaving(true);
    setError(null);
    setAuthFailure(null);
    const result = await saveHomeworkWritingSubmission({ homeworkId, text, submit });
    setSaving(false);
    if (!result.ok) {
      if (isStudentActionAuthFailure(result)) {
        setAuthFailure({
          failure: result,
          action: submit ? "submit" : "save_draft",
        });
      } else {
        setError(result.error);
      }
      return;
    }
    clearHomeworkWritingDraft(studentId, homeworkId);
    setRecoveryNotice(null);
    setStatus(result.status);
    setSavedAt(new Date().toISOString());
  }

  if (status === "submitted") {
    return (
      <div className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-8 text-center shadow-sm">
        <h2 className="text-2xl font-extrabold text-[var(--pl-ink)]">Submitted!</h2>
        <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)]">
          Your teacher can read your writing in Class Hub.
        </p>
        <Link
          href={homeHref}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)]"
        >
          {homeLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 shadow-sm">
      <div>
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--pl-muted)]">
          Writing prompt
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-lg font-semibold text-[var(--pl-ink)]">
          {prompt}
        </p>
        {payloadInstructions ? (
          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold text-[var(--pl-muted)]">
            {payloadInstructions}
          </p>
        ) : null}
      </div>

      <label className="block">
        <span className="text-sm font-extrabold text-[var(--pl-ink)]">Your writing</span>
        <textarea
          value={text}
          disabled={locked || saving}
          onChange={(event) => {
            const nextText = event.target.value;
            setText(nextText);
            writeHomeworkWritingDraft(studentId, homeworkId, nextText);
          }}
          rows={10}
          className="mt-2 w-full rounded-2xl border border-[var(--pl-border)] bg-white px-4 py-3 text-base font-medium text-[var(--pl-ink)] outline-none focus:border-[var(--pl-teal)]"
          placeholder="Write here…"
          aria-label="Your writing"
        />
      </label>

      {minWords > 0 ? (
        <p className="text-sm font-semibold text-[var(--pl-muted)]">
          At least {minWords} word{minWords === 1 ? "" : "s"} ({wordCount}/{minWords})
        </p>
      ) : (
        <p className="text-sm font-semibold text-[var(--pl-muted)]">{wordCount} words</p>
      )}

      {recoveryNotice ? (
        <p role="status" className="text-sm font-semibold text-emerald-800">
          {recoveryNotice}
        </p>
      ) : savedAt && status === "in_progress" ? (
        <p role="status" className="text-xs font-semibold text-emerald-700">
          Draft saved.
        </p>
      ) : null}
      {authFailure ? (
        <StudentActionFailureNotice
          failure={authFailure.failure}
          homeworkId={homeworkId}
          action={authFailure.action}
          retainedWorkMessage="Your writing is still kept on this device."
          onRetry={() => setAuthFailure(null)}
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={locked || saving || text.trim().length === 0}
          onClick={() => void persist(false)}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-white px-5 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={locked || saving || !canSubmit}
          onClick={() => void persist(true)}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
