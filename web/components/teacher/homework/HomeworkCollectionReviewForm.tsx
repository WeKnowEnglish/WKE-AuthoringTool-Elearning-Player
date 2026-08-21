"use client";

import { useState, useTransition } from "react";
import { saveHomeworkCollectionReview } from "@/lib/actions/homework-collection-review";

type ReviewPart = { id: string; label: string; maxScore: number };

export function HomeworkCollectionReviewForm({
  classId,
  homeworkId,
  attemptId,
  parts,
  initialParts,
  initialFeedback,
}: {
  classId: string;
  homeworkId: string;
  attemptId: string;
  parts: readonly ReviewPart[];
  initialParts: Record<string, { score: number; maxScore: number; feedback: string }>;
  initialFeedback: string;
}) {
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(parts.map((part) => [part.id, initialParts[part.id] ? String(initialParts[part.id]!.score) : ""])),
  );
  const [partFeedback, setPartFeedback] = useState<Record<string, string>>(() =>
    Object.fromEntries(parts.map((part) => [part.id, initialParts[part.id]?.feedback ?? ""])),
  );
  const [feedback, setFeedback] = useState(initialFeedback);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setNotice(null);
    const grades: Record<string, { score: number; maxScore: number; feedback: string }> = {};
    for (const part of parts) {
      const raw = scores[part.id]?.trim();
      if (!raw) continue;
      const score = Number(raw);
      if (!Number.isInteger(score) || score < 0 || score > part.maxScore) {
        setNotice(`${part.label} needs a whole-number score from 0 to ${part.maxScore}.`);
        return;
      }
      grades[part.id] = {
        score,
        maxScore: part.maxScore,
        feedback: partFeedback[part.id] ?? "",
      };
    }
    startTransition(async () => {
      const result = await saveHomeworkCollectionReview({
        classId,
        homeworkId,
        attemptId,
        parts: grades,
        feedback,
      });
      setNotice(result.ok ? "Grade and feedback saved." : result.error);
    });
  };

  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
      <h3 className="text-sm font-extrabold text-violet-950">Teacher review</h3>
      {parts.length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {parts.map((part) => (
            <div key={part.id} className="rounded-lg border border-violet-200 bg-white p-3">
              <label className="text-xs font-bold text-stone-800">
                {part.label} score
                <span className="mt-1 flex items-center gap-2">
                  <input type="number" min={0} max={part.maxScore} step={1} value={scores[part.id] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [part.id]: event.target.value }))} className="w-24 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
                  <span className="text-xs text-stone-500">/ {part.maxScore}</span>
                </span>
              </label>
              <label className="mt-2 block text-xs font-bold text-stone-800">
                Part feedback
                <input value={partFeedback[part.id] ?? ""} maxLength={500} onChange={(event) => setPartFeedback((current) => ({ ...current, [part.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm font-normal" />
              </label>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs font-semibold text-stone-600">All parts were scored automatically.</p>
      )}
      <label className="mt-3 block text-xs font-bold text-stone-800">
        Overall feedback
        <textarea rows={3} maxLength={2000} value={feedback} onChange={(event) => setFeedback(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal" />
      </label>
      {notice ? <p className={`mt-2 text-xs font-bold ${notice.includes("saved") ? "text-emerald-700" : "text-rose-700"}`}>{notice}</p> : null}
      <button type="button" disabled={pending} onClick={save} className="mt-3 rounded-lg bg-violet-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? "Saving…" : "Save review"}</button>
    </div>
  );
}
