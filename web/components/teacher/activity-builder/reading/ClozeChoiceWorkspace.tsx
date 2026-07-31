"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Copy, Plus, Save, Trash2 } from "lucide-react";
import styles from "@/components/teacher/activity-builder/reading/ReadingSuite.module.css";
import {
  CLOZE_GAP_FOCUSES,
  clozeChoiceValidationMessages,
  createClozeChoiceDraft,
  type ClozeChoiceDocument,
  type ClozeChoiceGap,
  type ClozeChoiceSegment,
} from "@/lib/activity-builder/reading/cloze-choice";

const STORAGE_KEY = "wke-admin-reading-cloze-choice-drafts:v1";
const inputClass = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";
const FOCUS_LABELS: Record<ClozeChoiceGap["focus"], string> = { vocabulary: "Vocabulary", grammar: "Grammar", connector: "Connector", reference: "Reference word" };

function readDrafts(): ClozeChoiceDocument[] {
  try { const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}
function writeDrafts(drafts: ClozeChoiceDocument[]) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts)); }

export function ClozeChoiceWorkspace() {
  const [drafts, setDrafts] = useState<ClozeChoiceDocument[]>([]);
  const [document, setDocument] = useState<ClozeChoiceDocument | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => { const stored = readDrafts(); setDrafts(stored); setDocument(stored[0] ?? createClozeChoiceDraft()); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const errors = useMemo(() => document ? clozeChoiceValidationMessages(document) : [], [document]);
  if (!document) return <div className="p-8 text-sm text-stone-500">Opening Reading Builder…</div>;

  const patch = (next: ClozeChoiceDocument) => setDocument(next);
  const patchSegment = (segmentId: string, nextSegment: ClozeChoiceSegment) => patch({ ...document, content: { ...document.content, segments: document.content.segments.map((segment) => segment.id === segmentId ? nextSegment : segment) } });
  const save = () => { const next = [document, ...drafts.filter((draft) => draft.id !== document.id)]; writeDrafts(next); setDrafts(next); setNotice(errors.length ? "Draft saved. Fix the validation items before review." : "Draft saved and ready for admin review."); };
  const duplicate = () => { const clone = structuredClone(document); clone.id = crypto.randomUUID(); clone.title = `${document.title} (copy)`; clone.content.segments = clone.content.segments.map((segment) => ({ ...segment, id: crypto.randomUUID() })); setDocument(clone); setNotice("Copy created. Save it when you are ready."); };
  const remove = () => { const next = drafts.filter((draft) => draft.id !== document.id); writeDrafts(next); setDrafts(next); setDocument(next[0] ?? createClozeChoiceDraft()); setNotice("Draft deleted."); };
  const gapNumbers = new Map(
    document.content.segments
      .filter((segment) => segment.type === "gap")
      .map((segment, index) => [segment.id, index + 1]),
  );

  return (
    <div className={`${styles.workspace} min-h-0 flex-1 overflow-y-auto bg-stone-50`}>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><div><Link href="/teacher/activity-builder" className="text-xs font-semibold text-sky-700 hover:underline">← Activity Builder</Link><h1 className="mt-1 text-xl font-bold text-stone-900">Cloze with Choices</h1><p className="text-xs font-medium text-amber-800">Admin development only · not publishable or assignable</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setDocument(createClozeChoiceDraft()); setNotice(null); }} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold"><Plus className="h-4 w-4" />New</button><button type="button" onClick={duplicate} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold"><Copy className="h-4 w-4" />Duplicate</button><button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"><Trash2 className="h-4 w-4" />Delete</button><button type="button" onClick={save} className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-4 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" />Save draft</button></div></div></header>

      <div className="mx-auto grid max-w-7xl gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)]">
        <div className="space-y-4">
          {notice ? <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">{notice}</p> : null}
          <section className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-stone-800 sm:col-span-2">Activity title<input className={inputClass} value={document.title} onChange={(event) => patch({ ...document, title: event.target.value })} /></label><label className="block text-sm font-semibold text-stone-800 sm:col-span-2">Student instructions<input className={inputClass} value={document.instructions} onChange={(event) => patch({ ...document, instructions: event.target.value })} /></label><label className="block text-sm font-semibold text-stone-800 sm:col-span-2">Learning objective<input className={inputClass} value={document.learningObjective} onChange={(event) => patch({ ...document, learningObjective: event.target.value })} /></label><label className="block text-sm font-semibold text-stone-800">CEFR level<select className={inputClass} value={document.cefrLevel} onChange={(event) => patch({ ...document, cefrLevel: event.target.value as ClozeChoiceDocument["cefrLevel"] })}><option value="pre_a1">Pre-A1</option><option value="a1">A1</option><option value="a2">A2</option></select></label><label className="block text-sm font-semibold text-stone-800">Estimated minutes<input className={inputClass} type="number" min={1} max={20} value={document.estimatedMinutes} onChange={(event) => patch({ ...document, estimatedMinutes: Number(event.target.value) })} /></label></section>

          <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4"><div><h2 className="font-bold text-stone-900">Passage builder</h2><p className="text-xs text-stone-500">Edit the text around five fixed gaps. Each gap needs 2–4 choices.</p></div><label className="block text-sm font-semibold text-stone-800">Passage title<input className={inputClass} value={document.content.passageTitle ?? ""} onChange={(event) => patch({ ...document, content: { ...document.content, passageTitle: event.target.value } })} /></label>
            <div className="space-y-3">{document.content.segments.map((segment) => {
              if (segment.type === "text") return <label key={segment.id} className="block rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs font-semibold text-stone-700">Passage text<textarea className={inputClass} rows={2} value={segment.text} onChange={(event) => patchSegment(segment.id, { ...segment, text: event.target.value })} /></label>;
              const number = gapNumbers.get(segment.id) ?? 0;
              return <div key={segment.id} className="space-y-3 rounded-xl border-2 border-amber-200 bg-amber-50/60 p-3"><div className="flex items-center justify-between"><h3 className="text-sm font-bold text-amber-950">Gap {number}</h3><label className="text-xs font-semibold text-stone-700">Focus<select className="ml-2 rounded border border-stone-300 bg-white px-2 py-1" value={segment.focus} onChange={(event) => patchSegment(segment.id, { ...segment, focus: event.target.value as ClozeChoiceGap["focus"] })}>{CLOZE_GAP_FOCUSES.map((focus) => <option key={focus} value={focus}>{FOCUS_LABELS[focus]}</option>)}</select></label></div><div className="space-y-2">{segment.options.map((option, optionIndex) => <div key={`${segment.id}-${optionIndex}`} className="flex items-center gap-2"><input type="radio" name={`correct-${segment.id}`} checked={segment.correctAnswer === option} onChange={() => patchSegment(segment.id, { ...segment, correctAnswer: option })} aria-label={`Mark gap ${number} choice ${optionIndex + 1} correct`} /><input className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm" value={option} onChange={(event) => { const nextOptions = segment.options.map((item, index) => index === optionIndex ? event.target.value : item); patchSegment(segment.id, { ...segment, options: nextOptions, correctAnswer: segment.correctAnswer === option ? event.target.value : segment.correctAnswer }); }} /><button type="button" disabled={segment.options.length <= 2} onClick={() => { const nextOptions = segment.options.filter((_, index) => index !== optionIndex); patchSegment(segment.id, { ...segment, options: nextOptions, correctAnswer: segment.correctAnswer === option ? nextOptions[0]! : segment.correctAnswer }); }} className="p-2 text-rose-700 disabled:opacity-30" aria-label={`Remove gap ${number} choice ${optionIndex + 1}`}><Trash2 className="h-4 w-4" /></button></div>)}</div><button type="button" disabled={segment.options.length >= 4} onClick={() => patchSegment(segment.id, { ...segment, options: [...segment.options, ""] })} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Add choice</button><label className="block text-xs font-semibold text-stone-700">Feedback<input className={inputClass} value={segment.feedback ?? ""} onChange={(event) => patchSegment(segment.id, { ...segment, feedback: event.target.value })} /></label></div>;
            })}</div>
          </section>

          <section className={`rounded-xl border p-4 ${errors.length ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}><h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">{errors.length ? "Before admin review" : <><Check className="h-4 w-4" />Ready for admin review</>}</h2>{errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : <p className="mt-1 text-sm text-emerald-900">All five gaps have valid choices and answers.</p>}</section>
        </div>
        <aside className="xl:sticky xl:top-24 xl:self-start"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500"><BookOpen className="h-4 w-4" />Primary student preview</div><ClozeChoicePreview key={document.id} document={document} /></aside>
      </div>
    </div>
  );
}

function ClozeChoicePreview({ document }: { document: ClozeChoiceDocument }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const gaps = document.content.segments.filter((segment): segment is ClozeChoiceGap => segment.type === "gap");
  const correct = gaps.filter((gap) => answers[gap.id] === gap.correctAnswer).length;
  return <div className="overflow-hidden rounded-3xl border-4 border-[#264653] bg-[#fffaf0] shadow-xl"><div className="bg-[#2a9d8f] px-5 py-4 text-white"><p className="text-xs font-black uppercase tracking-wide opacity-80">Reading cloze · {document.cefrLevel.replace("_", "-").toUpperCase()}</p><h2 className="mt-1 text-xl font-black">{document.title}</h2><p className="mt-1 text-sm font-bold text-emerald-50">{document.instructions}</p></div><div className="space-y-4 p-5"><article className="rounded-2xl border-2 border-emerald-100 bg-white p-5 shadow-sm"><h3 className="mb-3 text-lg font-black text-[#264653]">{document.content.passageTitle}</h3><p className="text-base font-semibold leading-10 text-slate-700">{document.content.segments.map((segment) => segment.type === "text" ? <span key={segment.id}>{segment.text}</span> : <select key={segment.id} disabled={checked} aria-label="Choose a word for this gap" value={answers[segment.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [segment.id]: event.target.value }))} className={`mx-1 inline-block min-w-24 rounded-lg border-2 px-2 py-1 text-sm font-black ${checked ? answers[segment.id] === segment.correctAnswer ? "border-emerald-500 bg-emerald-50" : "border-amber-500 bg-amber-50" : "border-[#2a9d8f] bg-white"}`}><option value="">Choose…</option>{segment.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>)}</p></article>{checked ? <><div className="rounded-2xl bg-[#264653] px-4 py-3 text-center text-sm font-black text-white">You completed {correct} of {gaps.length} gaps correctly.</div><div className="rounded-2xl border-2 border-emerald-100 bg-white p-4"><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Complete passage</p><p className="mt-2 text-sm font-semibold leading-7 text-slate-700">{document.content.segments.map((segment) => segment.type === "text" ? segment.text : segment.correctAnswer).join("")}</p></div></> : <button type="button" disabled={Object.keys(answers).length < gaps.length} onClick={() => setChecked(true)} className="w-full rounded-2xl bg-[#264653] px-4 py-3 text-sm font-black text-white disabled:opacity-40">Check my passage</button>}</div></div>;
}
