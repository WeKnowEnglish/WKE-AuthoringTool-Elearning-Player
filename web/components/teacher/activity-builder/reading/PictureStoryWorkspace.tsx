"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Copy, Plus, Save, Trash2 } from "lucide-react";
import styles from "@/components/teacher/activity-builder/reading/ReadingSuite.module.css";
import {
  createPictureStoryDraft,
  isPictureStoryAnswerCorrect,
  pictureStoryValidationMessages,
  type PictureStoryDocument,
  type PictureStoryFrame,
  type PictureStoryQuestion,
} from "@/lib/activity-builder/reading/picture-story";

const STORAGE_KEY = "wke-admin-reading-picture-story-drafts:v1";
const inputClass = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";

function readDrafts(): PictureStoryDocument[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function writeDrafts(drafts: PictureStoryDocument[]) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts)); }
function newFrame(index: number): PictureStoryFrame {
  return { id: crypto.randomUUID(), imageUrl: `https://placehold.co/640x400/e0f2fe/17375e?text=Story+page+${index + 1}`, imageAlt: "", text: "" };
}
function newQuestion(frameId: string, index: number): PictureStoryQuestion {
  return { id: crypto.randomUUID(), type: "sentence_completion", prompt: `Complete sentence ${index + 1}: ____`, acceptedAnswers: [""], options: [], correctOptionId: "", evidenceFrameId: frameId, feedback: "" };
}

export function PictureStoryWorkspace() {
  const [drafts, setDrafts] = useState<PictureStoryDocument[]>([]);
  const [document, setDocument] = useState<PictureStoryDocument | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readDrafts();
      setDrafts(stored);
      setDocument(stored[0] ?? createPictureStoryDraft());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const errors = useMemo(() => document ? pictureStoryValidationMessages(document) : [], [document]);
  if (!document) return <div className="p-8 text-sm text-stone-500">Opening Picture Story Builder…</div>;

  const patch = (next: PictureStoryDocument) => setDocument(next);
  const patchFrame = (id: string, values: Partial<PictureStoryFrame>) => patch({ ...document, content: { ...document.content, frames: document.content.frames.map((frame) => frame.id === id ? { ...frame, ...values } : frame) } });
  const patchQuestion = (id: string, values: Partial<PictureStoryQuestion>) => patch({ ...document, content: { ...document.content, questions: document.content.questions.map((question) => question.id === id ? { ...question, ...values } : question) } });
  const save = () => {
    const next = [document, ...drafts.filter((draft) => draft.id !== document.id)];
    writeDrafts(next); setDrafts(next);
    setNotice(errors.length ? "Draft saved. Fix the validation items before review." : "Draft saved and ready for admin review.");
  };
  const duplicate = () => {
    const clone = structuredClone(document);
    clone.id = crypto.randomUUID(); clone.title = `${clone.title} (copy)`;
    const frameMap = new Map(clone.content.frames.map((frame) => [frame.id, crypto.randomUUID()]));
    clone.content.frames = clone.content.frames.map((frame) => ({ ...frame, id: frameMap.get(frame.id)! }));
    clone.content.questions = clone.content.questions.map((question) => ({ ...question, id: crypto.randomUUID(), evidenceFrameId: frameMap.get(question.evidenceFrameId) ?? clone.content.frames[0]!.id, options: question.options.map((option) => ({ ...option, id: crypto.randomUUID() })) })).map((question) => ({ ...question, correctOptionId: question.type === "multiple_choice" ? question.options[0]?.id ?? "" : "" }));
    setDocument(clone); setNotice("Copy created. Save it when you are ready.");
  };
  const remove = () => {
    const next = drafts.filter((draft) => draft.id !== document.id);
    writeDrafts(next); setDrafts(next); setDocument(next[0] ?? createPictureStoryDraft()); setNotice("Draft deleted.");
  };

  return <div className={`${styles.workspace} min-h-0 flex-1 overflow-y-auto bg-stone-50`}>
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
      <div><Link href="/teacher/activity-builder" className="text-xs font-semibold text-sky-700 hover:underline">← Activity Builder</Link><h1 className="mt-1 text-xl font-bold text-stone-900">Picture Story Reading</h1><p className="text-xs font-medium text-amber-800">Admin development only · not publishable or assignable</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setDocument(createPictureStoryDraft()); setNotice(null); }} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold"><Plus className="h-4 w-4" />New</button>
        <button type="button" onClick={duplicate} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold"><Copy className="h-4 w-4" />Duplicate</button>
        <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"><Trash2 className="h-4 w-4" />Delete</button>
        <button type="button" onClick={save} className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-4 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" />Save draft</button>
      </div>
    </div></header>
    <div className="mx-auto grid max-w-7xl gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)]">
      <div className="space-y-4">
        {notice ? <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">{notice}</p> : null}
        <section className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold sm:col-span-2">Activity title<input className={inputClass} value={document.title} onChange={(event) => patch({ ...document, title: event.target.value })} /></label>
          <label className="block text-sm font-semibold sm:col-span-2">Student instructions<input className={inputClass} value={document.instructions} onChange={(event) => patch({ ...document, instructions: event.target.value })} /></label>
          <label className="block text-sm font-semibold sm:col-span-2">Learning objective<input className={inputClass} value={document.learningObjective} onChange={(event) => patch({ ...document, learningObjective: event.target.value })} /></label>
          <label className="block text-sm font-semibold">CEFR level<select className={inputClass} value={document.cefrLevel} onChange={(event) => patch({ ...document, cefrLevel: event.target.value as PictureStoryDocument["cefrLevel"] })}><option value="pre_a1">Pre-A1</option><option value="a1">A1</option><option value="a2">A2</option></select></label>
          <label className="block text-sm font-semibold">Estimated minutes<input className={inputClass} type="number" min={1} max={25} value={document.estimatedMinutes} onChange={(event) => patch({ ...document, estimatedMinutes: Number(event.target.value) })} /></label>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between"><div><h2 className="font-bold">Story frames</h2><p className="text-xs text-stone-500">Use 3–6 pictures. Keep each page to one clear event.</p></div><button type="button" disabled={document.content.frames.length >= 6} onClick={() => patch({ ...document, content: { ...document.content, frames: [...document.content.frames, newFrame(document.content.frames.length)] } })} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Add frame</button></div>
          {document.content.frames.map((frame, index) => <article key={frame.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex justify-between"><h3 className="font-bold">Frame {index + 1}</h3><button type="button" disabled={document.content.frames.length <= 3} onClick={() => patch({ ...document, content: { ...document.content, frames: document.content.frames.filter((item) => item.id !== frame.id) } })} className="text-rose-700 disabled:opacity-30" aria-label={`Remove frame ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>
            <label className="block text-sm font-semibold">Picture URL<input className={inputClass} value={frame.imageUrl} onChange={(event) => patchFrame(frame.id, { imageUrl: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Picture description<input className={inputClass} value={frame.imageAlt} onChange={(event) => patchFrame(frame.id, { imageAlt: event.target.value })} /></label>
            <label className="block text-sm font-semibold">Story words<textarea rows={3} className={inputClass} value={frame.text} onChange={(event) => patchFrame(frame.id, { text: event.target.value })} /></label>
          </article>)}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between"><div><h2 className="font-bold">Story questions</h2><p className="text-xs text-stone-500">Use 3–6 sentence completions or multiple-choice questions.</p></div><button type="button" disabled={document.content.questions.length >= 6} onClick={() => patch({ ...document, content: { ...document.content, questions: [...document.content.questions, newQuestion(document.content.frames[0]!.id, document.content.questions.length)] } })} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Add question</button></div>
          {document.content.questions.map((question, index) => <article key={question.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex justify-between"><h3 className="font-bold">Question {index + 1}</h3><button type="button" disabled={document.content.questions.length <= 3} onClick={() => patch({ ...document, content: { ...document.content, questions: document.content.questions.filter((item) => item.id !== question.id) } })} className="text-rose-700 disabled:opacity-30" aria-label={`Remove question ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">Question type<select className={inputClass} value={question.type} onChange={(event) => { const type = event.target.value as PictureStoryQuestion["type"]; if (type === "multiple_choice") { const options = [{ id: crypto.randomUUID(), text: "Choice 1" }, { id: crypto.randomUUID(), text: "Choice 2" }, { id: crypto.randomUUID(), text: "Choice 3" }]; patchQuestion(question.id, { type, acceptedAnswers: [], options, correctOptionId: options[0]!.id }); } else patchQuestion(question.id, { type, acceptedAnswers: [""], options: [], correctOptionId: "" }); }}><option value="sentence_completion">Complete a sentence</option><option value="multiple_choice">Multiple choice</option></select></label>
              <label className="block text-sm font-semibold">Evidence frame<select className={inputClass} value={question.evidenceFrameId} onChange={(event) => patchQuestion(question.id, { evidenceFrameId: event.target.value })}>{document.content.frames.map((frame, frameIndex) => <option key={frame.id} value={frame.id}>Frame {frameIndex + 1}</option>)}</select></label>
            </div>
            <label className="block text-sm font-semibold">Prompt<input className={inputClass} value={question.prompt} onChange={(event) => patchQuestion(question.id, { prompt: event.target.value })} /></label>
            {question.type === "sentence_completion" ? <label className="block text-sm font-semibold">Accepted answers, one per line<textarea rows={2} className={inputClass} value={question.acceptedAnswers.join("\n")} onChange={(event) => patchQuestion(question.id, { acceptedAnswers: event.target.value.split("\n") })} /></label> : <div className="space-y-2">{question.options.map((option, optionIndex) => <div key={option.id} className="flex items-center gap-2"><input type="radio" name={`correct-${question.id}`} checked={question.correctOptionId === option.id} onChange={() => patchQuestion(question.id, { correctOptionId: option.id })} aria-label={`Mark choice ${optionIndex + 1} correct`} /><input className="w-full rounded-lg border px-3 py-2 text-sm" value={option.text} onChange={(event) => patchQuestion(question.id, { options: question.options.map((item) => item.id === option.id ? { ...item, text: event.target.value } : item) })} /></div>)}</div>}
            <label className="block text-sm font-semibold">Helpful feedback<input className={inputClass} value={question.feedback ?? ""} onChange={(event) => patchQuestion(question.id, { feedback: event.target.value })} /></label>
          </article>)}
        </section>
        <label className="flex items-center gap-2 rounded-xl border bg-white p-4 text-sm font-semibold"><input type="checkbox" checked={document.content.allowStoryReviewDuringQuestions} onChange={(event) => patch({ ...document, content: { ...document.content, allowStoryReviewDuringQuestions: event.target.checked } })} />Let students look back at the story while answering</label>
        <section className={`rounded-xl border p-4 ${errors.length ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}><h2 className="flex items-center gap-2 text-sm font-bold">{errors.length ? "Before admin review" : <><Check className="h-4 w-4" />Ready for admin review</>}</h2>{errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : <p className="mt-1 text-sm text-emerald-900">The story and questions meet the Primary rules.</p>}</section>
      </div>
      <aside className="xl:sticky xl:top-24 xl:self-start"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500"><BookOpen className="h-4 w-4" />Primary student preview</div><PictureStoryPreview key={document.id} document={document} /></aside>
    </div>
  </div>;
}

function PictureStoryPreview({ document }: { document: PictureStoryDocument }) {
  const [phase, setPhase] = useState<"story" | "questions">("story");
  const [frameIndex, setFrameIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const frame = document.content.frames[Math.min(frameIndex, document.content.frames.length - 1)];
  const answerCorrect = (question: PictureStoryQuestion) => question.type === "sentence_completion" ? isPictureStoryAnswerCorrect(answers[question.id] ?? "", question) : answers[question.id] === question.correctOptionId;
  const score = document.content.questions.filter(answerCorrect).length;
  return <div className={`${styles.preview} max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-3xl border-4 border-[#17375e] bg-[#f5fbff] shadow-xl`}>
    <div className="bg-[#2878b5] px-5 py-4 text-white"><p className="text-xs font-black uppercase tracking-wide opacity-80">Picture story · {document.cefrLevel.replace("_", "-").toUpperCase()}</p><h2 className="mt-1 text-xl font-black">{document.title || "Picture Story"}</h2><p className="mt-1 text-sm font-bold text-sky-100">{document.instructions}</p></div>
    <div className="space-y-4 p-4 sm:p-5">
      {phase === "story" && frame ? <><p className="text-center text-xs font-black uppercase tracking-wide text-sky-700">Story page {frameIndex + 1} of {document.content.frames.length}</p><article className="overflow-hidden rounded-2xl border-2 border-sky-100 bg-white shadow-sm"><Image unoptimized src={frame.imageUrl} alt={frame.imageAlt || "Story picture"} width={640} height={400} className="aspect-[8/5] w-full object-cover" /><p className="p-4 text-lg font-bold leading-8 text-[#17375e]">{frame.text || "Add story words in the editor."}</p></article><div className="flex gap-2"><button type="button" disabled={frameIndex === 0} onClick={() => setFrameIndex((value) => value - 1)} className="flex flex-1 items-center justify-center rounded-xl border-2 border-sky-200 bg-white py-3 font-black text-[#17375e] disabled:opacity-30"><ChevronLeft className="h-5 w-5" />Back</button>{frameIndex < document.content.frames.length - 1 ? <button type="button" onClick={() => setFrameIndex((value) => value + 1)} className="flex flex-1 items-center justify-center rounded-xl bg-[#17375e] py-3 font-black text-white">Next<ChevronRight className="h-5 w-5" /></button> : <button type="button" onClick={() => setPhase("questions")} className="flex-1 rounded-xl bg-[#17375e] py-3 font-black text-white">Answer questions</button>}</div></> : null}
      {phase === "questions" ? <><div className="flex items-center justify-between"><h3 className="font-black text-[#17375e]">Show what you understood</h3>{document.content.allowStoryReviewDuringQuestions ? <button type="button" onClick={() => setPhase("story")} className="text-xs font-black text-sky-700 underline">Look back at story</button> : null}</div><div className="space-y-3">{document.content.questions.map((question, index) => { const correct = answerCorrect(question); return <section key={question.id} className="rounded-2xl border-2 border-sky-100 bg-white p-4"><h4 className="font-black text-[#17375e]">{index + 1}. {question.prompt}</h4>{question.type === "sentence_completion" ? <input disabled={checked} value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} className="mt-3 w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-bold" placeholder="Type the missing word" /> : <div className="mt-3 grid gap-2">{question.options.map((option) => <button type="button" disabled={checked} key={option.id} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-bold ${answers[question.id] === option.id ? "border-[#17375e] bg-sky-100" : "border-slate-200"}`}>{option.text}</button>)}</div>}{checked ? <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${correct ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>{correct ? "Correct!" : question.feedback || "Look back at the story and try again."}</p> : null}</section>; })}</div>{checked ? <><p className="rounded-2xl bg-[#17375e] p-3 text-center font-black text-white">You answered {score} of {document.content.questions.length} correctly.</p><button type="button" onClick={() => setChecked(false)} className="w-full rounded-xl border-2 border-[#17375e] bg-white py-3 font-black text-[#17375e]">Try again</button></> : <button type="button" disabled={document.content.questions.some((question) => !(answers[question.id] ?? "").trim())} onClick={() => setChecked(true)} className="w-full rounded-xl bg-[#17375e] py-3 font-black text-white disabled:opacity-40">Check my answers</button>}</> : null}
    </div>
  </div>;
}
