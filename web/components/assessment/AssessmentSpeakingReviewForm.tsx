"use client";

import { useState, useTransition } from "react";
import { saveAssessmentSpeakingReview } from "@/lib/actions/assessment-speaking-review";
import type { AssessmentSpeakingReview } from "@/lib/assessment";

const PARTS = [{ id: "speaking-part-1", label: "Differences" }, { id: "speaking-part-2", label: "Questions" }, { id: "speaking-part-3", label: "Story" }] as const;

export function AssessmentSpeakingReviewForm({ classId, homeworkId, studentId, initialReview }: { classId: string; homeworkId: string; studentId: string; initialReview: AssessmentSpeakingReview | null }) {
  const [scores, setScores] = useState<Record<string, number>>(() => Object.fromEntries(PARTS.map((part) => [part.id, initialReview?.scores[part.id] ?? 0])));
  const [feedback, setFeedback] = useState(initialReview?.feedback ?? "");
  const [notice, setNotice] = useState(initialReview ? "Reviewed" : "");
  const [pending, startTransition] = useTransition();
  return <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-violet-800">Speaking review · 0–5 per part</p><div className="mt-2 grid grid-cols-3 gap-2">{PARTS.map((part) => <label key={part.id} className="text-xs font-semibold text-neutral-700">{part.label}<select value={scores[part.id]} disabled={pending} onChange={(event) => setScores((current) => ({ ...current, [part.id]: Number(event.target.value) }))} className="mt-1 block min-h-9 w-full rounded border border-neutral-300 bg-white px-2">{[0,1,2,3,4,5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}</div><label className="mt-3 block text-xs font-semibold text-neutral-700">Feedback for the student<textarea value={feedback} disabled={pending} onChange={(event) => setFeedback(event.target.value)} rows={2} className="mt-1 block w-full rounded border border-neutral-300 bg-white p-2 text-sm" placeholder="One strength and one next step…" /></label><div className="mt-3 flex items-center gap-3"><button type="button" disabled={pending} onClick={() => startTransition(async () => { setNotice(""); const result = await saveAssessmentSpeakingReview({ classId, homeworkId, studentId, scores, feedback }); setNotice(result.ok ? "Review returned to student" : result.error); })} className="min-h-9 rounded bg-violet-700 px-3 text-xs font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : initialReview ? "Update review" : "Return speaking result"}</button>{notice ? <span className="text-xs font-semibold text-violet-800">{notice}</span> : null}</div></div>;
}
