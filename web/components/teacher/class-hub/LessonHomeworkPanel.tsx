"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { assignReleasedLessonHomework, getReleasedLessonHomework } from "@/lib/actions/lesson-delivery";

type HomeworkStep = { id: string; title: string; minutes: number; instructions: string; previewPath: string | null };

export function LessonHomeworkPanel({ releaseId, disabled }: { releaseId: string; disabled: boolean }) {
  const [steps, setSteps] = useState<HomeworkStep[] | null>(null);
  const [due, setDue] = useState("");
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (work: () => Promise<void>) => startTransition(async () => {
    setError(null);
    try { await work(); } catch (error) { setError(error instanceof Error ? error.message : "Could not prepare homework."); }
  });
  return <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-3">
    <p className="text-sm font-semibold text-neutral-900">Homework from the released lesson</p>
    <p className="text-xs text-neutral-600">Review each task, then assign it to everyone in this class. Students receive the frozen material, instructions, support, and success criteria.</p>
    <button type="button" disabled={disabled || pending} onClick={() => run(async () => {
      const result = await getReleasedLessonHomework(releaseId);
      if (!result.ok) throw new Error(result.error);
      setSteps(result.steps);
    })} className="rounded border border-teal-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">Review released homework</button>
    {steps && !steps.length ? <p className="text-sm text-neutral-600">This release has no homework steps. Add a homework step and release the updated plan.</p> : null}
    {steps?.length ? <>
      <label className="block text-sm font-semibold">Due date (optional, your local time)
        <input type="datetime-local" value={due} disabled={disabled || pending} onChange={(event) => setDue(event.target.value)} className="mt-1 block rounded border border-neutral-300 bg-white p-2 font-normal" />
      </label>
      <ol className="space-y-3">{steps.map((step) => <li key={step.id} className="space-y-2 rounded-lg border bg-white p-3">
        <p className="font-semibold">{step.title} · {step.minutes} min</p>
        <p className="whitespace-pre-wrap text-sm text-neutral-700">{step.instructions}</p>
        <div className="flex flex-wrap gap-2">
          {step.previewPath ? <Link href={step.previewPath} target="_blank" rel="noopener noreferrer" className="rounded border px-3 py-2 text-sm font-semibold">Preview frozen homework</Link> : null}
          <button type="button" disabled={disabled || pending || Boolean(assigned[step.id])} onClick={() => run(async () => {
            const result = await assignReleasedLessonHomework({ releaseId, stepId: step.id, dueAt: due ? new Date(due).toISOString() : null });
            if (!result.ok) throw new Error(result.error);
            setAssigned((current) => ({ ...current, [step.id]: result.homeworkId }));
          })} className="rounded bg-teal-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{assigned[step.id] ? "Assigned to class" : "Assign this homework"}</button>
        </div>
        {assigned[step.id] ? <p role="status" className="text-xs text-teal-900">Available in Students &amp; homework. Repeated requests reuse this assignment.</p> : null}
      </li>)}</ol>
    </> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
  </div>;
}
