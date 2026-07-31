"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CircleCheck, CircleDashed, PencilLine } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { checkPictureWriting, type PictureWritingSection } from "@/lib/homework-templates/homework-template-one";

const STORAGE_KEY = "wke-pilot-homework-template-one:picture-writing:v1";

export function PictureWritingActivity({ section, onBack, onNext, onReadyChange }: { section: PictureWritingSection; onBack: () => void; onNext: () => void; onReadyChange?: (ready: boolean) => void }) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"); if (saved?.responses) setResponses(saved.responses); if (typeof saved?.checked === "boolean") setChecked(saved.checked); if (typeof saved?.reviewing === "boolean") setReviewing(saved.reviewing); } catch { /* Ignore malformed pilot progress. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ responses, checked, reviewing })); }, [checked, hydrated, responses, reviewing]);
  const checks = useMemo(() => Object.fromEntries(section.prompts.map((prompt) => [prompt.id, checkPictureWriting(responses[prompt.id] ?? "", prompt)])), [responses, section.prompts]);
  const allReady = checked && section.prompts.every((prompt) => { const result = checks[prompt.id]; return result.capitalLetter && result.endingPunctuation && result.minimumWords && result.requiredWords; });
  useEffect(() => { onReadyChange?.(allReady); }, [allReady, onReadyChange]);
  if (!hydrated) return <KidPanel className="bg-white">Opening Part 5…</KidPanel>;
  if (reviewing) return <KidPanel className="bg-white text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-sky-100 text-sky-700"><PencilLine className="h-14 w-14" /></div><p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-sky-700">Part 5 review</p><h2 className="mt-2 text-3xl font-black text-kid-ink">Writing ready for teacher review</h2><p className="mx-auto mt-3 max-w-2xl text-lg font-bold text-kid-ink/70">All {section.prompts.length} responses meet the basic writing checks. Your teacher can now review meaning, grammar, and sentence quality.</p><div className="mx-auto mt-6 max-w-3xl space-y-3 text-left">{section.prompts.map((prompt, index) => <div key={prompt.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Response {index + 1}</p><p className="mt-1 font-semibold leading-7 text-slate-800">{responses[prompt.id]}</p><span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">Teacher review pending</span></div>)}</div><div className="mt-7 flex flex-wrap justify-center gap-3"><KidButton variant="secondary" onClick={onBack}>Back to Part 4</KidButton><KidButton onClick={() => { setReviewing(false); setChecked(false); }}>Edit my writing</KidButton><KidButton onClick={onNext}>Continue to Part 6</KidButton></div></KidPanel>;

  return <div className="space-y-4"><KidPanel className="bg-white"><div className="flex items-start gap-4"><div className="rounded-2xl bg-sky-100 p-3 text-sky-800"><PencilLine className="h-8 w-8" /></div><div><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Part 5 of 6 · Writing</p><h2 className="mt-1 text-2xl font-black text-kid-ink">{section.title}</h2><p className="mt-1 font-semibold text-kid-ink/70">{section.instructions}</p></div></div><p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">The helper checks sentence basics. Your teacher checks whether your ideas and grammar communicate clearly.</p></KidPanel>
    {section.prompts.map((prompt, index) => { const result = checks[prompt.id]; const ready = result.capitalLetter && result.endingPunctuation && result.minimumWords && result.requiredWords; return <article key={prompt.id} className={`overflow-hidden rounded-2xl border-4 bg-white shadow-[4px_4px_0_0_#bfdbfe] ${checked ? ready ? "border-emerald-500" : "border-amber-400" : "border-[#17375e]"}`}><div className="grid md:grid-cols-[18rem_minmax(0,1fr)]"><Image unoptimized src={prompt.imageUrl} alt={prompt.imageAlt} width={640} height={400} className="h-full min-h-56 w-full bg-sky-50 object-contain" /><div className="space-y-4 p-5"><div><p className="text-xs font-black uppercase tracking-wide text-sky-700">Picture {index + 1}</p><h3 className="mt-1 text-xl font-black text-[#17375e]">{prompt.question}</h3></div><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Prompt words</p><div className="mt-2 flex flex-wrap gap-2">{prompt.promptWords.map((word) => <span key={word} className="rounded-lg bg-sky-100 px-3 py-1.5 text-sm font-black text-sky-900">{word}</span>)}</div></div>{prompt.sentenceStarter ? <p className="text-sm font-bold text-slate-600">You may start: <strong className="text-[#17375e]">{prompt.sentenceStarter}…</strong></p> : null}<label className="block text-sm font-black text-slate-700">Your complete sentence<textarea rows={3} value={responses[prompt.id] ?? ""} onChange={(event) => { setResponses((current) => ({ ...current, [prompt.id]: event.target.value })); setChecked(false); }} className="mt-2 w-full rounded-xl border-2 border-sky-300 bg-sky-50 px-4 py-3 text-base font-semibold leading-7 text-slate-800 focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-100" /></label><p className="text-xs font-bold text-slate-500">{result.wordCount} words · at least {prompt.minWords}</p>{checked ? <WritingChecklist result={result} /> : null}</div></div></article>; })}
    <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white"><button type="button" onClick={onBack} className="text-sm font-black text-sky-800 underline underline-offset-4">Back to Part 4</button>{allReady ? <KidButton onClick={() => setReviewing(true)}>Send for teacher review</KidButton> : <KidButton disabled={section.prompts.some((prompt) => !(responses[prompt.id] ?? "").trim())} onClick={() => setChecked(true)}>{checked ? "Check again" : "Check my writing"}</KidButton>}</KidPanel>
  </div>;
}

function WritingChecklist({ result }: { result: ReturnType<typeof checkPictureWriting> }) {
  const rows = [["Capital letter", result.capitalLetter], ["Ending punctuation", result.endingPunctuation], ["Enough words", result.minimumWords], ["Required prompt words", result.requiredWords]] as const;
  return <div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">{rows.map(([label, pass]) => <p key={label} className={`flex items-center gap-2 text-xs font-black ${pass ? "text-emerald-800" : "text-amber-900"}`}>{pass ? <CircleCheck className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}{label}</p>)}</div>;
}
