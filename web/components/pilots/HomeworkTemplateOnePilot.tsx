"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Check, Clock3, LockKeyhole, RotateCcw } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { WordAnnotationActivity } from "@/components/pilots/homework-template-one/WordAnnotationActivity";
import { SentenceColumnsActivity } from "@/components/pilots/homework-template-one/SentenceColumnsActivity";
import { VerbTableActivity } from "@/components/pilots/homework-template-one/VerbTableActivity";
import { PictureWritingActivity } from "@/components/pilots/homework-template-one/PictureWritingActivity";
import { QuestionWritingActivity } from "@/components/pilots/homework-template-one/QuestionWritingActivity";
import { recordHomeworkTemplateCompletion } from "@/lib/actions/class-homework";
import {
  HOMEWORK_TEMPLATE_ONE,
  isPictureClozeAnswerCorrect,
  type PictureClozeSection,
  type WordAnnotationSection,
  type SentenceColumnsSection,
  type VerbTableSection,
  type PictureWritingSection,
  type QuestionWritingSection,
} from "@/lib/homework-templates/homework-template-one";

const STORAGE_KEY = "wke-pilot-homework-template-one:v1";
type PilotStage = "overview" | "activity" | "review";
type SavedProgress = { answers: Record<string, string>; checked: boolean; stage: PilotStage; activePart: 1 | 2 | 3 | 4 | 5 | 6; partTwoDone?: boolean; partThreeDone?: boolean; partFourDone?: boolean; partFiveDone?: boolean };

function readProgress(): SavedProgress {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (value && typeof value === "object") return value as SavedProgress;
  } catch { /* Start clean when pilot data is malformed. */ }
  return { answers: {}, checked: false, stage: "overview", activePart: 1 };
}

export function HomeworkTemplateOnePilot({ homeworkId, alreadyCompleted = false }: { homeworkId?: string; alreadyCompleted?: boolean } = {}) {
  const section = HOMEWORK_TEMPLATE_ONE.sections[0] as PictureClozeSection;
  const annotationSection = HOMEWORK_TEMPLATE_ONE.sections[1] as WordAnnotationSection;
  const sentenceColumnsSection = HOMEWORK_TEMPLATE_ONE.sections[2] as SentenceColumnsSection;
  const verbTableSection = HOMEWORK_TEMPLATE_ONE.sections[3] as VerbTableSection;
  const pictureWritingSection = HOMEWORK_TEMPLATE_ONE.sections[4] as PictureWritingSection;
  const questionWritingSection = HOMEWORK_TEMPLATE_ONE.sections[5] as QuestionWritingSection;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState<PilotStage>("overview");
  const [activePart, setActivePart] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [partTwoDone, setPartTwoDone] = useState(false);
  const [partThreeDone, setPartThreeDone] = useState(false);
  const [partFourDone, setPartFourDone] = useState(false);
  const [partFiveDone, setPartFiveDone] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [completionNotice, setCompletionNotice] = useState(alreadyCompleted ? "This homework is already marked complete." : "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readProgress();
      setAnswers(saved.answers); setChecked(saved.checked); setStage(saved.stage); setActivePart(saved.activePart ?? 1); setPartTwoDone(saved.partTwoDone ?? false); setPartThreeDone(saved.partThreeDone ?? false); setPartFourDone(saved.partFourDone ?? false); setPartFiveDone(saved.partFiveDone ?? false); setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, checked, stage, activePart, partTwoDone, partThreeDone, partFourDone, partFiveDone } satisfies SavedProgress));
  }, [activePart, answers, checked, hydrated, partFiveDone, partFourDone, partThreeDone, partTwoDone, stage]);

  const score = useMemo(() => section.items.filter((item) => isPictureClozeAnswerCorrect(answers[item.id] ?? "", item.acceptedAnswers)).length, [answers, section.items]);
  const partOneDone = checked && score === section.items.length;
  const complete = section.items.every((item) => (answers[item.id] ?? "").trim());
  const reset = () => { setAnswers({}); setChecked(false); setStage("overview"); setActivePart(1); setPartTwoDone(false); setPartThreeDone(false); setPartFourDone(false); setPartFiveDone(false); window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem("wke-pilot-homework-template-one:word-annotation:v1"); window.localStorage.removeItem("wke-pilot-homework-template-one:sentence-columns:v1"); window.localStorage.removeItem("wke-pilot-homework-template-one:verb-table:v1"); window.localStorage.removeItem("wke-pilot-homework-template-one:picture-writing:v1"); window.localStorage.removeItem("wke-pilot-homework-template-one:question-writing:v1"); };
  const finishAssignedHomework = () => {
    if (!homeworkId || alreadyCompleted) return;
    setCompletionNotice("Saving completion…");
    void recordHomeworkTemplateCompletion({ homeworkId }).then((result) => {
      setCompletionNotice(result.ok ? "Homework complete — your teacher can now see it." : result.error);
    });
  };

  if (!hydrated) return <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">Opening homework template…</div>;

  return <main className="min-h-dvh bg-[linear-gradient(180deg,#eff8ff_0%,#fff9ed_100%)] px-3 py-5 sm:px-6">
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
        <div><Link href={homeworkId ? "/primary" : "/pilots"} className="text-xs font-bold text-sky-700 hover:underline">← {homeworkId ? "Primary Home" : "Pilots"}</Link><h1 className="mt-1 text-2xl font-black tracking-tight text-[#17375e]">{HOMEWORK_TEMPLATE_ONE.title}</h1><p className="text-sm font-semibold text-slate-600">{HOMEWORK_TEMPLATE_ONE.subtitle}</p></div>
        <div className="flex items-center gap-3"><span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900"><Clock3 className="h-4 w-4" />~{HOMEWORK_TEMPLATE_ONE.estimatedMinutes} min</span><button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Reset pilot</button></div>
      </header>

      {completionNotice ? <p className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">{completionNotice}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
          <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Six-part homework</p>
          {HOMEWORK_TEMPLATE_ONE.sections.map((item) => {
            const isFirst = item.order === 1;
            const isSecond = item.order === 2;
            const isThird = item.order === 3;
            const isFourth = item.order === 4;
            const isFifth = item.order === 5;
            const isSixth = item.order === 6;
            const available = isFirst || (isSecond && partOneDone) || (isThird && partTwoDone) || (isFourth && partThreeDone) || (isFifth && partFourDone) || (isSixth && partFiveDone);
            const active = item.order === activePart;
            const done = isFirst && partOneDone;
            return <button type="button" disabled={!available} onClick={() => { if (available) { setActivePart(item.order as 1 | 2); if (isFirst && stage === "review") setStage("activity"); } }} key={item.id} className={`w-full rounded-xl border-2 p-3 text-left ${active ? "border-sky-500 bg-white shadow-sm" : available ? "border-slate-300 bg-white hover:border-sky-400" : "border-slate-200 bg-white/60 text-slate-500"}`}>
              <div className="flex items-start gap-2"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${done ? "bg-emerald-500 text-white" : active ? "bg-[#17375e] text-white" : available ? "bg-sky-100 text-sky-900" : "bg-slate-200 text-slate-600"}`}>{done ? <Check className="h-4 w-4" /> : item.order}</span><div className="min-w-0"><p className="text-sm font-black">{item.title}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide">{item.skill}{available ? " · ready" : " · planned"}</p></div>{!available ? <LockKeyhole className="ml-auto h-4 w-4 shrink-0" /> : null}</div>
            </button>;
          })}
        </aside>

        <div className="min-w-0">
          {activePart === 1 && stage === "overview" ? <Overview section={section} onStart={() => setStage("activity")} /> : null}
          {activePart === 1 && stage === "activity" ? <PictureClozeActivity section={section} answers={answers} checked={checked} onAnswer={(id, answer) => { setAnswers((current) => ({ ...current, [id]: answer })); setChecked(false); }} onCheck={() => setChecked(true)} onReview={() => setStage("review")} complete={complete} score={score} /> : null}
          {activePart === 1 && stage === "review" ? <Review section={section} answers={answers} score={score} onRetry={() => { setChecked(false); setStage("activity"); }} onNext={() => setActivePart(2)} /> : null}
          {activePart === 2 ? <WordAnnotationActivity section={annotationSection} onMasteryChange={setPartTwoDone} onNext={() => setActivePart(3)} onBack={() => { setActivePart(1); setStage("activity"); }} /> : null}
          {activePart === 3 ? <SentenceColumnsActivity section={sentenceColumnsSection} onMasteryChange={setPartThreeDone} onNext={() => setActivePart(4)} onBack={() => setActivePart(2)} /> : null}
          {activePart === 4 ? <VerbTableActivity section={verbTableSection} onMasteryChange={setPartFourDone} onNext={() => setActivePart(5)} onBack={() => setActivePart(3)} /> : null}
          {activePart === 5 ? <PictureWritingActivity section={pictureWritingSection} onReadyChange={setPartFiveDone} onNext={() => setActivePart(6)} onBack={() => setActivePart(4)} /> : null}
          {activePart === 6 ? <QuestionWritingActivity section={questionWritingSection} onBack={() => setActivePart(5)} onSubmit={finishAssignedHomework} /> : null}
        </div>
      </div>
    </div>
  </main>;
}

function Overview({ section, onStart }: { section: PictureClozeSection; onStart: () => void }) {
  return <KidPanel className="bg-white"><div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_18rem]"><div><span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-900">Part 1 · Vocabulary</span><h2 className="mt-4 text-3xl font-black text-kid-ink">{section.title}</h2><p className="mt-3 max-w-2xl text-lg font-semibold leading-8 text-kid-ink/75">{section.instructions}</p><ul className="mt-5 space-y-2 text-sm font-bold text-kid-ink/70"><li>✓ Four picture questions</li><li>✓ One shared word bank</li><li>✓ Your work saves on this device</li></ul><KidButton className="mt-6" onClick={onStart}>Start Part 1</KidButton></div><div className="rounded-3xl bg-sky-100 p-7 text-center"><BookOpenCheck className="mx-auto h-24 w-24 text-[#2878b5]" /><p className="mt-3 text-lg font-black text-[#17375e]">Look carefully.<br />Write the whole word.</p></div></div></KidPanel>;
}

function PictureClozeActivity({ section, answers, checked, onAnswer, onCheck, onReview, complete, score }: { section: PictureClozeSection; answers: Record<string, string>; checked: boolean; onAnswer: (id: string, answer: string) => void; onCheck: () => void; onReview: () => void; complete: boolean; score: number }) {
  return <div className="space-y-4"><KidPanel className="bg-white"><p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Part 1 of 6</p><h2 className="mt-1 text-2xl font-black text-kid-ink">{section.title}</h2><p className="mt-1 font-semibold text-kid-ink/70">{section.instructions}</p><div className="mt-4"><p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Word bank</p><div className="flex flex-wrap gap-2">{section.wordBank.map((word) => <button key={word} type="button" onClick={() => { const firstEmpty = section.items.find((item) => !(answers[item.id] ?? "").trim()); if (firstEmpty) onAnswer(firstEmpty.id, word); }} className="rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-[#17375e] hover:border-sky-500 hover:bg-sky-100">{word}</button>)}</div></div></KidPanel>
    <div className="grid gap-4 xl:grid-cols-2">{section.items.map((item, index) => { const correct = isPictureClozeAnswerCorrect(answers[item.id] ?? "", item.acceptedAnswers); return <article key={item.id} className={`overflow-hidden rounded-2xl border-4 bg-white shadow-[4px_4px_0_0_#bed4e6] ${checked ? correct ? "border-emerald-500" : "border-amber-400" : "border-[#17375e]"}`}><Image unoptimized src={item.imageUrl} alt={item.imageAlt} width={640} height={400} className="aspect-[8/5] w-full bg-sky-50 object-contain" /><div className="space-y-3 p-4"><p className="text-xs font-black uppercase tracking-wide text-sky-700">Picture {index + 1}</p><p className="text-lg font-black text-[#17375e]">{item.prompt}</p><label className="block text-base font-bold leading-10 text-slate-700"><span>{item.sentenceBefore}</span><input value={answers[item.id] ?? ""} disabled={checked && correct} onChange={(event) => onAnswer(item.id, event.target.value)} aria-label={`Answer for picture ${index + 1}`} className="mx-2 inline-block w-32 rounded-lg border-2 border-sky-300 bg-sky-50 px-2 py-1 text-center font-black text-[#17375e] focus:border-sky-600 focus:outline-none focus:ring-4 focus:ring-sky-100" /><span>{item.sentenceAfter}</span></label>{checked ? <p className={`rounded-lg px-3 py-2 text-sm font-black ${correct ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"}`}>{correct ? "Correct!" : "Look at the picture and try another word."}</p> : null}</div></article>; })}</div>
    <KidPanel className="flex flex-wrap items-center justify-between gap-3 bg-white"><div><p className="font-black text-kid-ink">{Object.values(answers).filter((answer) => answer.trim()).length} of 4 answered</p><p className="text-sm font-semibold text-kid-ink/65">Finish every sentence before checking.</p></div>{checked && score === section.items.length ? <KidButton onClick={onReview}>Review Part 1</KidButton> : <KidButton disabled={!complete} onClick={onCheck}>{checked ? "Check again" : "Check my answers"}</KidButton>}</KidPanel>
  </div>;
}

function Review({ section, answers, score, onRetry, onNext }: { section: PictureClozeSection; answers: Record<string, string>; score: number; onRetry: () => void; onNext: () => void }) {
  const mastered = score === section.items.length;
  return <KidPanel className="bg-white text-center"><div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${mastered ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}><BookOpenCheck className="h-14 w-14" /></div><p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-sky-700">Part 1 review</p><h2 className="mt-2 text-3xl font-black text-kid-ink">{mastered ? "Picture cloze complete!" : "Good start—try once more."}</h2><p className="mt-2 text-lg font-bold text-kid-ink/70">You completed {score} of {section.items.length} sentences correctly.</p><div className="mx-auto mt-6 max-w-xl space-y-2 text-left">{section.items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><span className="font-semibold text-slate-700">{item.sentenceBefore}<strong>{answers[item.id]}</strong>{item.sentenceAfter}</span><span className={isPictureClozeAnswerCorrect(answers[item.id] ?? "", item.acceptedAnswers) ? "font-black text-emerald-700" : "font-black text-amber-800"}>{isPictureClozeAnswerCorrect(answers[item.id] ?? "", item.acceptedAnswers) ? "Correct" : `Answer: ${item.acceptedAnswers[0]}`}</span></div>)}</div><div className="mt-7 flex flex-wrap justify-center gap-3"><KidButton variant="secondary" onClick={onRetry}>{mastered ? "Practise again" : "Fix my answers"}</KidButton>{mastered ? <KidButton onClick={onNext}>Continue to Part 2</KidButton> : null}</div></KidPanel>;
}
