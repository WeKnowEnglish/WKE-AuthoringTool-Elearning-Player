"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { saveHomeworkWritingSubmission } from "@/lib/actions/homework-writing-submission";
import { countWritingWords } from "@/lib/class-homework/normalize";
import type { HomeworkWritingSubmission } from "@/lib/data/homework-writing-submissions";

type Props = {
  homeworkId: string;
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
  const [savedAt, setSavedAt] = useState<string | null>(initialSubmission?.updatedAt ?? null);

  useEffect(() => {
    setText(initialSubmission?.text ?? "");
    setStatus(
      initialSubmission?.status === "submitted" || alreadyCompleted ? "submitted" : "in_progress",
    );
    setSavedAt(initialSubmission?.updatedAt ?? null);
  }, [alreadyCompleted, initialSubmission]);

  const wordCount = countWritingWords(text);
  const canSubmit = text.trim().length > 0 && (minWords <= 0 || wordCount >= minWords);
  const locked = status === "submitted";

  async function persist(submit: boolean) {
    setSaving(true);
    setError(null);
    const result = await saveHomeworkWritingSubmission({ homeworkId, text, submit });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
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
          onChange={(event) => setText(event.target.value)}
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

      {savedAt && status === "in_progress" ? (
        <p className="text-xs font-semibold text-emerald-700">Draft saved.</p>
      ) : null}
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

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
