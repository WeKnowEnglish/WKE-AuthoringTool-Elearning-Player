"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleCheck, CircleDashed, HelpCircle, Send } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { checkQuestionWriting, type QuestionWritingSection } from "@/lib/homework-templates/homework-template-one";

const STORAGE_KEY = "wke-pilot-homework-template-one:question-writing:v1";

export function QuestionWritingActivity({ section, onBack, onSubmit }: { section: QuestionWritingSection; onBack: () => void; onSubmit?: () => void }) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"); if (saved?.responses) setResponses(saved.responses); if (typeof saved?.checked === "boolean") setChecked(saved.checked); if (typeof saved?.submitted === "boolean") setSubmitted(saved.submitted); } catch { /* Ignore malformed pilot progress. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ responses, checked, submitted })); }, [checked, hydrated, responses, submitted]);
  const checks = useMemo(() => Object.fromEntries(section.prompts.map((prompt) => [prompt.id, checkQuestionWriting(responses[prompt.id] ?? "", prompt)])), [responses, section.prompts]);
  const allReady = checked && section.prompts.every((prompt) => { const result = checks[prompt.id]; return result.capitalLetter && result.questionMark && result.minimumWords && result.requiredWords && result.questionWord && result.helpingVerb; });
  if (!hydrated) return <KidPanel className="bg-white">Opening Part 6…</KidPanel>;
  if (submitted) return <KidPanel className="bg-white text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Send className="h-13 w-13" /></div><p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-indigo-700">Homework review</p><h2 className="mt-2 text-3xl font-black text-kid-ink">All six parts are complete!</h2><p className="mx-auto mt-3 max-w-2xl text-lg font-bold text-kid-ink/70">Your automatically checked work is complete. Your picture sentences and questions are ready for your teacher to review.</p><div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-2"><SummaryCard label="Parts 1–4" value="Automatically checked" tone="emerald" /><SummaryCard label="Parts 5–6" value="Teacher review pending" tone="amber" /></div><div className="mx-auto mt-6 max-w-3xl space-y-3 text-left">{section.prompts.map((prompt, index) => <div key={prompt.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Question {index + 1}</p><p className="mt-1 font-semibold leading-7 text-slate-800">{responses[prompt.id]}</p></div>)}</div><div className="mt-7 flex flex-wrap justify-center gap-3"><KidButton variant="secondary" onClick={onBack}>Back to Part 5</KidButton><KidButton onClick={() => { setSubmitted(false); setChecked(false); }}>Edit my questions</KidButton></div></KidPanel>;

  return <div className="space-y-4"><KidPanel className="bg-white"><div className="flex items-start gap-4"><div className="rounded-2xl bg-indigo-100 p-3 text-indigo-800"><HelpCircle className="h-8 w-8" /></div><div><p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-700">Part 6 of 6 · Writing</p><h2 className="mt-1 text-2xl font-black text-kid-ink">{section.title}</h2><p className="mt-1 font-semibold text-kid-ink/70">{section.instructions}</p></div></div><div className="mt-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-indigo-700">Example</p><p className="mt-2 font-bold text-slate-600">{section.workedExample.prompt}</p><p className="mt-1 text-lg font-black text-indigo-950">{section.workedExample.question}</p><p className="mt-1 font-semibold text-slate-700">{section.workedExample.answer}</p></div><p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">The helper checks question structure. Your teacher checks whether each question is natural and grammatically complete.</p></KidPanel>
    {section.prompts.map((prompt, index) => { const result = checks[prompt.id]; const ready = result.capitalLetter && result.questionMark && result.minimumWords && result.requiredWords && result.questionWord && result.helpingVerb; return <article key={prompt.id} className={`rounded-2xl border-4 bg-white p-5 shadow-[4px_4px_0_0_#c7d2fe] ${checked ? ready ? "border-emerald-500" : "border-amber-400" : "border-[#312e81]"}`}><p className="text-xs font-black uppercase tracking-wide text-indigo-700">Question {index + 1}</p><div className="mt-3 flex flex-wrap items-center gap-2">{prompt.promptWords.map((word, wordIndex) => <span key={`${word}-${wordIndex}`} className="rounded-lg bg-indigo-100 px-3 py-2 text-base font-black text-indigo-950">{word}</span>)}</div><label className="mt-4 block text-sm font-black text-slate-700">Write the complete question<input value={responses[prompt.id] ?? ""} onChange={(event) => { setResponses((current) => ({ ...current, [prompt.id]: event.target.value })); setChecked(false); }} className="mt-2 w-full rounded-xl border-2 border-indigo-300 bg-indigo-50 px-4 py-3 text-base font-semibold text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100" /></label><p className="mt-2 text-xs font-bold text-slate-500">{result.wordCount} words · start with “{prompt.questionWord}”</p>{checked ? <QuestionChecklist result={result} /> : null}</article>; })}
    <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white"><button type="button" onClick={onBack} className="text-sm font-black text-sky-800 underline underline-offset-4">Back to Part 5</button>{allReady ? <KidButton onClick={() => { setSubmitted(true); onSubmit?.(); }}>Finish homework</KidButton> : <KidButton disabled={section.prompts.some((prompt) => !(responses[prompt.id] ?? "").trim())} onClick={() => setChecked(true)}>{checked ? "Check again" : "Check my questions"}</KidButton>}</KidPanel>
  </div>;
}

function QuestionChecklist({ result }: { result: ReturnType<typeof checkQuestionWriting> }) {
  const rows = [["Capital letter", result.capitalLetter], ["Question mark", result.questionMark], ["Enough words", result.minimumWords], ["Prompt words", result.requiredWords], ["Question word first", result.questionWord], ["Helping verb", result.helpingVerb]] as const;
  return <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([label, pass]) => <p key={label} className={`flex items-center gap-2 text-xs font-black ${pass ? "text-emerald-800" : "text-amber-900"}`}>{pass ? <CircleCheck className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}{label}</p>)}</div>;
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" }) {
  return <div className={`rounded-xl p-4 ${tone === "emerald" ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"}`}><p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>;
}
