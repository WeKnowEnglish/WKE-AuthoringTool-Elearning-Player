"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, Lightbulb } from "lucide-react";
import type { HomeworkCollectionCreativePresentationPart } from "@/lib/homework-collections";
import { creativePresentationStepComplete } from "@/lib/homework-collections";
import { CreativePresentationMediaField } from "@/components/homework/CreativePresentationMediaField";
import { CreativePresentationViewer } from "@/components/homework/CreativePresentationViewer";

export function CreativePresentationPlayer({
  part,
  answers,
  onAnswer,
  homeworkId,
  previewMode = false,
}: {
  part: HomeworkCollectionCreativePresentationPart;
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
  homeworkId?: string;
  previewMode?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const complete = creativePresentationStepComplete(part, answers, step);

  if (showPresentation) {
    return (
      <div className="space-y-3">
        <CreativePresentationViewer part={part} answers={answers} />
        <button type="button" onClick={() => setShowPresentation(false)} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800"><ArrowLeft className="h-4 w-4" />Back to my work</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="h-2 overflow-hidden rounded-full bg-stone-200" aria-label={`Step ${step + 1} of 4`}>
        <div className="h-full rounded-full bg-teal-600 transition-[width]" style={{ width: `${(step + 1) * 25}%` }} />
      </div>
      <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-teal-700">{step + 1} of 4</p>

      <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        {step === 0 ? (
          <>
            <h3 className="text-2xl font-black text-stone-950">Your VLOG idea</h3>
            <Prompt question={part.idea.question} direction={part.idea.direction} />
            <textarea value={answers[part.idea.textId] ?? ""} onChange={(event) => onAnswer(part.idea.textId, event.target.value)} rows={6} placeholder="My VLOG is about..." className="mt-4 w-full resize-y rounded-xl border-2 border-stone-200 px-4 py-3 text-base font-semibold leading-7 outline-none focus:border-teal-600" />
            <HelpButton open={showHelp} onClick={() => setShowHelp((value) => !value)} />
            {showHelp ? <StarterButtons values={part.idea.starters} onChoose={(value) => onAnswer(part.idea.textId, `${answers[part.idea.textId] ? `${answers[part.idea.textId]} ` : ""}${value}`)} /> : null}
            <div className="mt-4">
              <p className="mb-2 text-sm font-extrabold text-stone-900">Add one picture</p>
              <CreativePresentationMediaField homeworkId={homeworkId} partId={part.id} slotId={part.idea.mediaId} value={answers[part.idea.mediaId] ?? ""} onChange={(value) => onAnswer(part.idea.mediaId, value)} previewMode={previewMode} />
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h3 className="text-2xl font-black text-stone-950">Your video plan</h3>
            <Prompt question={part.plan.question} direction={part.plan.direction} />
            <div className="mt-5 space-y-4">
              {part.plan.fields.map((field) => (
                <label key={field.id} className="block text-sm font-extrabold text-stone-900">
                  {field.label}
                  <input value={answers[field.id] ?? ""} onChange={(event) => onAnswer(field.id, event.target.value)} placeholder={field.starter} className="mt-2 w-full rounded-xl border-2 border-stone-200 px-4 py-3 text-base font-semibold outline-none focus:border-teal-600" />
                </label>
              ))}
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h3 className="text-2xl font-black text-stone-950">Show your plan</h3>
            <Prompt question={part.story.question} direction={part.story.direction} />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {part.story.frames.map((frame) => (
                <div key={frame.id}>
                  <p className="mb-2 text-center text-sm font-extrabold text-stone-900">{frame.label}</p>
                  <CreativePresentationMediaField homeworkId={homeworkId} partId={part.id} slotId={frame.id} value={answers[frame.id] ?? ""} onChange={(value) => onAnswer(frame.id, value)} previewMode={previewMode} compact />
                </div>
              ))}
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h3 className="text-2xl font-black text-stone-950">Start your VLOG</h3>
            <Prompt question={part.opening.question} direction={part.opening.direction} />
            <textarea value={answers[part.opening.textId] ?? ""} onChange={(event) => onAnswer(part.opening.textId, event.target.value)} rows={8} placeholder="Hi everyone! Welcome to my VLOG..." className="mt-4 w-full resize-y rounded-xl border-2 border-stone-200 px-4 py-3 text-base font-semibold leading-7 outline-none focus:border-teal-600" />
            <HelpButton open={showHelp} onClick={() => setShowHelp((value) => !value)} />
            {showHelp ? <StarterButtons values={part.opening.starters} onChoose={(value) => onAnswer(part.opening.textId, `${answers[part.opening.textId] ? `${answers[part.opening.textId]} ` : ""}${value}`)} /> : null}
          </>
        ) : null}
      </div>

      {!complete && !previewMode ? (
        <p className="mt-3 text-center text-xs font-bold text-amber-800">Finish this step to continue.</p>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" disabled={step === 0} onClick={() => { setStep((current) => Math.max(0, current - 1)); setShowHelp(false); }} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 disabled:opacity-30"><ArrowLeft className="h-4 w-4" />Back</button>
        {step < 3 ? (
          <button type="button" disabled={!complete && !previewMode} onClick={() => { setStep((current) => Math.min(3, current + 1)); setShowHelp(false); }} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-teal-700 px-5 text-sm font-extrabold text-white disabled:opacity-40">Next<ArrowRight className="h-4 w-4" /></button>
        ) : (
          <button type="button" disabled={!complete && !previewMode} onClick={() => setShowPresentation(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-extrabold text-white disabled:opacity-40"><Eye className="h-4 w-4" />See my VLOG</button>
        )}
      </div>
    </div>
  );
}

function Prompt({ question, direction }: { question: string; direction: string }) {
  return <><p className="mt-5 text-lg font-extrabold text-stone-950">{question}</p><p className="mt-1 text-sm font-semibold text-stone-500">{direction}</p></>;
}

function HelpButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return <button type="button" aria-expanded={open} onClick={onClick} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-sky-700 underline"><Lightbulb className="h-4 w-4" />Need help writing?</button>;
}

function StarterButtons({ values, onChoose }: { values: string[]; onChoose: (value: string) => void }) {
  return <div className="flex flex-wrap gap-2">{values.map((value) => <button key={value} type="button" onClick={() => onChoose(value)} className="min-h-10 rounded-lg bg-sky-50 px-3 text-xs font-bold text-sky-900">{value}</button>)}</div>;
}
