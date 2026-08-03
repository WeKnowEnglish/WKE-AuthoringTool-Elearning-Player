"use client";

import { useState, useTransition } from "react";
import { saveHomeworkTemplateReview } from "@/lib/actions/homework-template-review";

type ReviewPart = {
  id: string;
  label: string;
  total: number;
  correct: number | null;
};

export function HomeworkTemplateReviewForm({
  classId,
  homeworkId,
  submissionId,
  parts,
  initialGrades,
  initialFeedback,
}: {
  classId: string;
  homeworkId: string;
  submissionId: string;
  parts: readonly ReviewPart[];
  initialGrades: Record<string, { score: number; maxScore: number; feedback: string }>;
  initialFeedback: string;
}) {
  const reviewable = parts.filter((part) => part.correct === null);
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(reviewable.map((part) => [part.id, initialGrades[part.id] ? String(initialGrades[part.id]!.score) : ""])));
  const [partFeedback, setPartFeedback] = useState<Record<string, string>>(() => Object.fromEntries(reviewable.map((part) => [part.id, initialGrades[part.id]?.feedback ?? ""])));
  const [feedback, setFeedback] = useState(initialFeedback);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setNotice(null);
    let validationError: string | null = null;
    const grades = Object.fromEntries(reviewable.flatMap((part) => {
      const raw = scores[part.id]?.trim();
      if (!raw) return [];
      const score = Number(raw);
      if (!Number.isInteger(score) || score < 0 || score > part.total) {
        validationError = `${part.label} needs a whole-number score from 0 to ${part.total}.`;
        return [];
      }
      return [[part.id, { score, maxScore: part.total, feedback: partFeedback[part.id] ?? "" }]];
    }));
    if (validationError) {
      setNotice(validationError);
      return;
    }
    startTransition(async () => {
      const result = await saveHomeworkTemplateReview({ classId, homeworkId, submissionId, grades, feedback });
      setNotice(result.ok ? "Grade and feedback saved." : result.error);
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4">
      <h3 className="text-sm font-bold text-violet-950">Teacher grading</h3>
      {reviewable.length ? <div className="mt-3 grid gap-3 md:grid-cols-2">{reviewable.map((part) => <div key={part.id} className="rounded-md border border-violet-200 bg-white p-3">
        <label className="text-xs font-bold text-neutral-800">{part.label} score
          <span className="mt-1 flex items-center gap-2"><input type="number" min={0} max={part.total} step={1} value={scores[part.id] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [part.id]: event.target.value }))} className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" /><span className="text-xs text-neutral-500">/ {part.total}</span></span>
        </label>
        <label className="mt-2 block text-xs font-bold text-neutral-800">Part feedback
          <input value={partFeedback[part.id] ?? ""} maxLength={500} onChange={(event) => setPartFeedback((current) => ({ ...current, [part.id]: event.target.value }))} className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm font-normal" />
        </label>
      </div>)}</div> : <p className="mt-2 text-xs font-semibold text-neutral-600">Every submitted part is automatically scored. You can still leave overall feedback.</p>}
      <label className="mt-3 block text-xs font-bold text-neutral-800">Overall feedback
        <textarea rows={3} maxLength={2000} value={feedback} onChange={(event) => setFeedback(event.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal" />
      </label>
      {notice ? <p className={`mt-2 text-xs font-bold ${notice.includes("saved") ? "text-emerald-700" : "text-rose-700"}`}>{notice}</p> : null}
      <button type="button" disabled={pending} onClick={save} className="mt-3 rounded-md bg-violet-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? "Saving…" : "Save grade"}</button>
    </div>
  );
}
