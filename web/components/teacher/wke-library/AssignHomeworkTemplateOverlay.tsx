"use client";

import Link from "next/link";
import { useState } from "react";
import { assignHomeworkTemplateOne } from "@/lib/actions/class-homework";

type ClassOption = { id: string; title: string };

export function AssignHomeworkTemplateOverlay({ open, onClose, classes }: { open: boolean; onClose: () => void; classes: readonly ClassOption[] }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [title, setTitle] = useState("Homework Template One");
  const [instructions, setInstructions] = useState("Complete all six parts. Check your answers carefully before you finish.");
  const [dueLocal, setDueLocal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ classId: string; title: string; status: string } | null>(null);

  async function submit(status: "draft" | "assigned") {
    setBusy(true);
    setError(null);
    const result = await assignHomeworkTemplateOne({
      classId,
      title,
      instructions,
      dueAt: dueLocal ? new Date(dueLocal).toISOString() : null,
      status,
    });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setSuccess({ classId: result.homework.classId, title: result.homework.title, status: result.homework.status });
  }

  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Assign Homework Template One" onClick={onClose}>
    <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
      <header className="flex items-start justify-between gap-3 border-b border-stone-200 p-4"><div><h2 className="text-lg font-bold text-stone-900">Assign as homework</h2><p className="text-sm text-stone-600">Homework Template One · 6 parts · Primary</p></div><button type="button" onClick={onClose} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold">Close</button></header>
      <div className="space-y-4 p-4">
        {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-bold">{success.status === "assigned" ? "Assigned" : "Saved as draft"}: {success.title}</p><div className="mt-3 flex gap-2"><Link href={`/teacher/classes/${success.classId}`} className="rounded-lg bg-emerald-800 px-3 py-2 font-semibold text-white">Open class</Link><button type="button" onClick={onClose} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 font-semibold">Done</button></div></div> : <>
          {classes.length === 0 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">Create a class before assigning homework.</p> : <>
            <label className="block text-sm font-semibold text-stone-800">Class<select value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal">{classes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label className="block text-sm font-semibold text-stone-800">Homework title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal" /></label>
            <label className="block text-sm font-semibold text-stone-800">Instructions<textarea rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal" /></label>
            <label className="block text-sm font-semibold text-stone-800">Due date (optional)<input type="datetime-local" value={dueLocal} onChange={(event) => setDueLocal(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal" /></label>
          </>}
          {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
        </>}
      </div>
      {!success ? <footer className="flex justify-end gap-2 border-t border-stone-200 p-4"><button type="button" disabled={busy || !classId} onClick={() => void submit("draft")} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Save draft</button><button type="button" disabled={busy || !classId} onClick={() => void submit("assigned")} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Assigning…" : "Assign now"}</button></footer> : null}
    </div>
  </div>;
}
