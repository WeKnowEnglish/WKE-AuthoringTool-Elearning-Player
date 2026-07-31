"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Copy, Plus, Save, Trash2 } from "lucide-react";
import styles from "@/components/teacher/activity-builder/reading/ReadingSuite.module.css";
import {
  createReadAndAnswerDraft,
  readAndAnswerValidationMessages,
  READING_QUESTION_SKILLS,
  type ReadAndAnswerDocument,
  type ReadAndAnswerQuestion,
} from "@/lib/activity-builder/reading/read-and-answer";

const STORAGE_KEY = "wke-admin-reading-read-and-answer-drafts:v1";
const inputClass = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";

const SKILL_LABELS: Record<(typeof READING_QUESTION_SKILLS)[number], string> = {
  detail: "Find a detail",
  main_idea: "Main idea",
  sequence: "Sequence",
  vocabulary_in_context: "Vocabulary in context",
  simple_inference: "Simple inference",
};

function readDrafts(): ReadAndAnswerDocument[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: ReadAndAnswerDocument[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

function newQuestion(index: number): ReadAndAnswerQuestion {
  const options = Array.from({ length: 3 }, (_, optionIndex) => ({ id: crypto.randomUUID(), text: `Choice ${optionIndex + 1}` }));
  return { id: crypto.randomUUID(), prompt: `Question ${index + 1}`, skill: "detail", options, correctOptionId: options[0]!.id, explanation: "", evidence: "" };
}

export function ReadAndAnswerWorkspace() {
  const [drafts, setDrafts] = useState<ReadAndAnswerDocument[]>([]);
  const [document, setDocument] = useState<ReadAndAnswerDocument | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readDrafts();
      setDrafts(stored);
      setDocument(stored[0] ?? createReadAndAnswerDraft());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const errors = useMemo(() => document ? readAndAnswerValidationMessages(document) : [], [document]);
  if (!document) return <div className="p-8 text-sm text-stone-500">Opening Reading Builder…</div>;

  const patch = (next: ReadAndAnswerDocument) => setDocument(next);
  const patchQuestion = (questionId: string, questionPatch: Partial<ReadAndAnswerQuestion>) => patch({ ...document, content: { ...document.content, questions: document.content.questions.map((question) => question.id === questionId ? { ...question, ...questionPatch } : question) } });
  const save = () => {
    const next = [document, ...drafts.filter((draft) => draft.id !== document.id)];
    writeDrafts(next);
    setDrafts(next);
    setNotice(errors.length ? "Draft saved. Fix the validation items before review." : "Draft saved and ready for admin review.");
  };
  const duplicate = () => {
    const clone = structuredClone(document);
    clone.id = crypto.randomUUID();
    clone.title = `${document.title} (copy)`;
    clone.content.questions = clone.content.questions.map((question) => ({ ...question, id: crypto.randomUUID(), options: question.options.map((option) => ({ ...option, id: crypto.randomUUID() })) })).map((question) => ({ ...question, correctOptionId: question.options[0]!.id }));
    setDocument(clone);
    setNotice("Copy created. Save it when you are ready.");
  };
  const remove = () => {
    const next = drafts.filter((draft) => draft.id !== document.id);
    writeDrafts(next);
    setDrafts(next);
    setDocument(next[0] ?? createReadAndAnswerDraft());
    setNotice("Draft deleted.");
  };

  return (
    <div className={`${styles.workspace} min-h-0 flex-1 overflow-y-auto bg-stone-50`}>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div><Link href="/teacher/activity-builder" className="text-xs font-semibold text-sky-700 hover:underline">← Activity Builder</Link><h1 className="mt-1 text-xl font-bold text-stone-900">Read and Answer</h1><p className="text-xs font-medium text-amber-800">Admin development only · not publishable or assignable</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setDocument(createReadAndAnswerDraft()); setNotice(null); }} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold"><Plus className="h-4 w-4" />New</button>
            <button type="button" onClick={duplicate} className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold"><Copy className="h-4 w-4" />Duplicate</button>
            <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"><Trash2 className="h-4 w-4" />Delete</button>
            <button type="button" onClick={save} className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-4 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" />Save draft</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)]">
        <div className="space-y-4">
          {notice ? <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">{notice}</p> : null}
          <section className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">Activity title<input className={inputClass} value={document.title} onChange={(event) => patch({ ...document, title: event.target.value })} /></label>
            <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">Student instructions<input className={inputClass} value={document.instructions} onChange={(event) => patch({ ...document, instructions: event.target.value })} /></label>
            <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">Learning objective<input className={inputClass} value={document.learningObjective} onChange={(event) => patch({ ...document, learningObjective: event.target.value })} /></label>
            <label className="block text-sm font-semibold text-stone-800">CEFR level<select className={inputClass} value={document.cefrLevel} onChange={(event) => patch({ ...document, cefrLevel: event.target.value as ReadAndAnswerDocument["cefrLevel"] })}><option value="pre_a1">Pre-A1</option><option value="a1">A1</option><option value="a2">A2</option></select></label>
            <label className="block text-sm font-semibold text-stone-800">Estimated minutes<input className={inputClass} type="number" min={1} max={30} value={document.estimatedMinutes} onChange={(event) => patch({ ...document, estimatedMinutes: Number(event.target.value) })} /></label>
          </section>

          <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-bold text-stone-900">Reading passage</h2>
            <label className="block text-sm font-semibold text-stone-800">Passage title<input className={inputClass} value={document.content.passage.title ?? ""} onChange={(event) => patch({ ...document, content: { ...document.content, passage: { ...document.content.passage, title: event.target.value } } })} /></label>
            <label className="block text-sm font-semibold text-stone-800">Passage text<textarea rows={8} className={inputClass} value={document.content.passage.text} onChange={(event) => patch({ ...document, content: { ...document.content, passage: { ...document.content.passage, text: event.target.value } } })} /><span className="mt-1 block text-xs font-normal text-stone-500">{document.content.passage.text.trim().split(/\s+/).filter(Boolean).length} words · recommended 40–150 words</span></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-stone-800">Supporting image URL (optional)<input className={inputClass} value={document.content.passage.imageUrl ?? ""} onChange={(event) => patch({ ...document, content: { ...document.content, passage: { ...document.content.passage, imageUrl: event.target.value } } })} /></label>
              <label className="block text-sm font-semibold text-stone-800">Image description<input className={inputClass} value={document.content.passage.imageAlt ?? ""} onChange={(event) => patch({ ...document, content: { ...document.content, passage: { ...document.content.passage, imageAlt: event.target.value } } })} /></label>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-stone-900">Comprehension questions</h2><p className="text-xs text-stone-500">Add 3–5 questions with 2–4 choices.</p></div><button type="button" disabled={document.content.questions.length >= 5} onClick={() => patch({ ...document, content: { ...document.content, questions: [...document.content.questions, newQuestion(document.content.questions.length)] } })} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40">Add question</button></div>
            {document.content.questions.map((question, questionIndex) => (
              <div key={question.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-stone-900">Question {questionIndex + 1}</h3><button type="button" disabled={document.content.questions.length <= 3} onClick={() => patch({ ...document, content: { ...document.content, questions: document.content.questions.filter((item) => item.id !== question.id) } })} className="rounded-lg p-2 text-rose-700 disabled:opacity-30" aria-label={`Remove question ${questionIndex + 1}`}><Trash2 className="h-4 w-4" /></button></div>
                <label className="block text-sm font-semibold text-stone-800">Question prompt<input className={inputClass} value={question.prompt} onChange={(event) => patchQuestion(question.id, { prompt: event.target.value })} /></label>
                <label className="block text-sm font-semibold text-stone-800">Reading skill<select className={inputClass} value={question.skill} onChange={(event) => patchQuestion(question.id, { skill: event.target.value as ReadAndAnswerQuestion["skill"] })}>{READING_QUESTION_SKILLS.map((skill) => <option key={skill} value={skill}>{SKILL_LABELS[skill]}</option>)}</select></label>
                <div className="space-y-2">{question.options.map((option, optionIndex) => <div key={option.id} className="flex items-center gap-2"><input type="radio" name={`correct-${question.id}`} checked={question.correctOptionId === option.id} onChange={() => patchQuestion(question.id, { correctOptionId: option.id })} aria-label={`Mark choice ${optionIndex + 1} correct`} /><input className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" value={option.text} onChange={(event) => patchQuestion(question.id, { options: question.options.map((item) => item.id === option.id ? { ...item, text: event.target.value } : item) })} /><button type="button" disabled={question.options.length <= 2} onClick={() => { const nextOptions = question.options.filter((item) => item.id !== option.id); patchQuestion(question.id, { options: nextOptions, correctOptionId: question.correctOptionId === option.id ? nextOptions[0]!.id : question.correctOptionId }); }} className="p-2 text-rose-700 disabled:opacity-30" aria-label={`Remove choice ${optionIndex + 1}`}><Trash2 className="h-4 w-4" /></button></div>)}</div>
                <button type="button" disabled={question.options.length >= 4} onClick={() => patchQuestion(question.id, { options: [...question.options, { id: crypto.randomUUID(), text: "" }] })} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Add choice</button>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-stone-800">Evidence from the passage<textarea rows={2} className={inputClass} value={question.evidence ?? ""} onChange={(event) => patchQuestion(question.id, { evidence: event.target.value })} /></label><label className="block text-sm font-semibold text-stone-800">Answer explanation<textarea rows={2} className={inputClass} value={question.explanation ?? ""} onChange={(event) => patchQuestion(question.id, { explanation: event.target.value })} /></label></div>
              </div>
            ))}
          </section>

          <section className={`rounded-xl border p-4 ${errors.length ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}><h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">{errors.length ? "Before admin review" : <><Check className="h-4 w-4" />Ready for admin review</>}</h2>{errors.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">{errors.map((error) => <li key={error}>{error}</li>)}</ul> : <p className="mt-1 text-sm text-emerald-900">The passage and questions meet the Primary rules.</p>}</section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500"><BookOpen className="h-4 w-4" />Primary student preview</div><ReadAndAnswerPreview key={document.id} document={document} /></aside>
      </div>
    </div>
  );
}

function ReadAndAnswerPreview({ document }: { document: ReadAndAnswerDocument }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const correct = document.content.questions.filter((question) => answers[question.id] === question.correctOptionId).length;
  return (
    <div className={`${styles.preview} max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-3xl border-4 border-[#17375e] bg-[#f5fbff] shadow-xl`}>
      <div className="bg-[#2878b5] px-5 py-4 text-white"><p className="text-xs font-black uppercase tracking-wide opacity-80">Reading · {document.cefrLevel.replace("_", "-").toUpperCase()}</p><h2 className="mt-1 text-xl font-black">{document.title || "Read and Answer"}</h2><p className="mt-1 text-sm font-bold text-sky-100">{document.instructions}</p></div>
      <div className="space-y-4 p-4 sm:p-5">
        <article className="rounded-2xl border-2 border-sky-100 bg-white p-4 shadow-sm">
          {document.content.passage.imageUrl ? <Image unoptimized src={document.content.passage.imageUrl} alt={document.content.passage.imageAlt || "Passage illustration"} width={640} height={360} className="mb-4 max-h-52 w-full rounded-xl object-contain" /> : null}
          <h3 className="text-lg font-black text-[#17375e]">{document.content.passage.title}</h3><p className="mt-2 whitespace-pre-wrap text-base font-semibold leading-7 text-slate-700">{document.content.passage.text || "Add a passage in the editor."}</p>
        </article>
        <div className="space-y-3">{document.content.questions.map((question, index) => { const isCorrect = answers[question.id] === question.correctOptionId; return <section key={question.id} className="rounded-2xl border-2 border-sky-100 bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wide text-sky-700">{SKILL_LABELS[question.skill]}</p><h4 className="mt-1 font-black text-[#17375e]">{index + 1}. {question.prompt}</h4><div className="mt-3 grid gap-2">{question.options.map((option) => <button key={option.id} type="button" disabled={checked} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} className={`rounded-xl border-2 px-3 py-2 text-left text-sm font-bold ${answers[question.id] === option.id ? "border-[#17375e] bg-sky-100" : "border-slate-200 bg-white"}`}>{option.text || "Empty choice"}</button>)}</div>{checked ? <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}><p>{isCorrect ? "Correct!" : "Look back at the passage."}</p>{question.evidence ? <p className="mt-1 font-semibold">Clue: {question.evidence}</p> : null}{question.explanation ? <p className="mt-1 font-semibold">{question.explanation}</p> : null}</div> : null}</section>; })}</div>
        {checked ? <p className="rounded-2xl bg-[#17375e] px-4 py-3 text-center text-sm font-black text-white">You answered {correct} of {document.content.questions.length} correctly.</p> : <button type="button" disabled={Object.keys(answers).length < document.content.questions.length} onClick={() => setChecked(true)} className="w-full rounded-2xl bg-[#17375e] px-4 py-3 text-sm font-black text-white disabled:opacity-40">Check my answers</button>}
      </div>
    </div>
  );
}
