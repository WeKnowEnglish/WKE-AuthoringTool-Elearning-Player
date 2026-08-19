"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Volume2 } from "lucide-react";
import { HomeworkFinishPanel } from "@/components/primary/HomeworkPlayChrome";
import { saveHomeworkCollectionAttempt } from "@/lib/actions/homework-collection-attempt";
import {
  homeworkCollectionAttemptTotals,
  homeworkCollectionGradingMode,
  type HomeworkCollectionAttempt,
  type HomeworkCollectionDocument,
  type HomeworkCollectionPart,
} from "@/lib/homework-collections";
import { acceptPrimaryRewardReceipt } from "@/lib/primary-player/client";

type Responses = Record<string, { answers: Record<string, string> }>;

type Props = {
  document: HomeworkCollectionDocument;
  homeworkId?: string;
  initialAttempt?: HomeworkCollectionAttempt | null;
  alreadyCompleted?: boolean;
  mode?: "student" | "authoring-preview";
  focusPartId?: string | null;
  onSubmitted?: () => void;
};

function responsesFromAttempt(attempt?: HomeworkCollectionAttempt | null): Responses {
  if (!attempt) return {};
  return Object.fromEntries(
    Object.entries(attempt.content.parts).map(([partId, part]) => [
      partId,
      { answers: { ...part.answers } },
    ]),
  );
}

function wordCount(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function shuffled<T>(items: readonly T[]): T[] {
  if (items.length < 2) return [...items];
  return [...items].reverse();
}

function scrambledLetters(value: string): string {
  const letters = Array.from(value.replace(/\s/g, ""));
  const reversed = letters.reverse().join(" ");
  return reversed || value;
}

function PartHeader({ part, index, total }: { part: HomeworkCollectionPart; index: number; total: number }) {
  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-wide text-teal-700">
          Activity {index + 1} of {total}
        </p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${homeworkCollectionGradingMode(part.kind) === "automatic" ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"}`}>
          {homeworkCollectionGradingMode(part.kind) === "automatic" ? "Auto-graded" : "Teacher review"}
        </span>
      </div>
      <h2 className="mt-2 text-2xl font-extrabold text-stone-900">{part.title}</h2>
      {part.instructions ? (
        <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-stone-600">
          {part.instructions}
        </p>
      ) : null}
    </header>
  );
}

export function HomeworkCollectionPlayer({
  document,
  homeworkId,
  initialAttempt,
  alreadyCompleted = false,
  mode = "student",
  focusPartId = null,
  onSubmitted,
}: Props) {
  const authoringPreview = mode === "authoring-preview";
  const [activeIndex, setActiveIndex] = useState(() => {
    const focusIndex = focusPartId
      ? document.parts.findIndex((part) => part.id === focusPartId)
      : -1;
    return focusIndex >= 0 ? focusIndex : 0;
  });
  const [responses, setResponses] = useState<Responses>(() => responsesFromAttempt(initialAttempt));
  const [attempt, setAttempt] = useState(initialAttempt ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [finished, setFinished] = useState(initialAttempt?.status === "submitted");
  const [pending, startTransition] = useTransition();
  const focusedIndex = focusPartId
    ? document.parts.findIndex((entry) => entry.id === focusPartId)
    : -1;
  const displayIndex = authoringPreview && focusedIndex >= 0 ? focusedIndex : activeIndex;
  const part = document.parts[displayIndex] ?? document.parts[0]!;

  const currentAnswers = responses[part.id]?.answers ?? {};
  const setAnswer = (itemId: string, value: string) => {
    setResponses((current) => ({
      ...current,
      [part.id]: {
        answers: { ...(current[part.id]?.answers ?? {}), [itemId]: value },
      },
    }));
    setNotice(null);
  };

  const save = (submit: boolean, nextIndex?: number) => {
    if (authoringPreview || !homeworkId) {
      if (typeof nextIndex === "number") setActiveIndex(nextIndex);
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const result = await saveHomeworkCollectionAttempt({
        homeworkId,
        responses,
        submit,
      });
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setAttempt(result.attempt);
      if (result.rewardReceipt) acceptPrimaryRewardReceipt(result.rewardReceipt);
      if (submit) {
        setFinished(true);
        onSubmitted?.();
      } else if (typeof nextIndex === "number") {
        setActiveIndex(nextIndex);
      }
    });
  };

  const previewContent = useMemo(
    () => ({ version: 1 as const, parts: Object.fromEntries(document.parts.map((entry) => [entry.id, {
      partId: entry.id,
      kind: entry.kind,
      gradingMode: homeworkCollectionGradingMode(entry.kind),
      answers: responses[entry.id]?.answers ?? {},
      correct: null,
      maxScore: 0,
      answered: Object.values(responses[entry.id]?.answers ?? {}).filter(Boolean).length,
      itemCount: 0,
    }])) }),
    [document.parts, responses],
  );
  const recordedTotals = attempt
    ? homeworkCollectionAttemptTotals(attempt.content)
    : homeworkCollectionAttemptTotals(previewContent);

  if (finished && attempt) {
    const hasManual = attempt.manualMaxScore > 0;
    return (
      <HomeworkFinishPanel
        title="Homework submitted"
        detail={`${attempt.autoScore}/${attempt.autoMaxScore} automatically graded${hasManual ? ". Your written answers are waiting for teacher feedback." : "."}`}
        saving={pending}
        saved
        saveError={notice}
        retryLabel="Review answers"
        onRetry={() => {
          setFinished(false);
          setActiveIndex(0);
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-3 sm:p-5">
      {alreadyCompleted && !authoringPreview ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          This homework is already complete. You can still review your work.
        </p>
      ) : null}
      <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="Homework activities">
        {document.parts.map((entry, index) => {
          const answered = Object.values(responses[entry.id]?.answers ?? {}).filter(Boolean).length;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => save(false, index)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold ${index === displayIndex ? "border-teal-700 bg-teal-700 text-white" : "border-stone-200 bg-white text-stone-700"}`}
            >
              {answered ? <Check className="h-3.5 w-3.5" /> : null}
              {index + 1}. {entry.title}
            </button>
          );
        })}
      </nav>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <PartHeader part={part} index={displayIndex} total={document.parts.length} />

        <div className="mt-6 space-y-5">
          {part.kind === "multiple_choice"
            ? part.questions.map((question, index) => (
                <fieldset key={question.id} className="rounded-xl border border-stone-200 p-4">
                  <legend className="px-1 text-sm font-extrabold text-stone-900">
                    {index + 1}. {question.prompt}
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {question.options.map((option) => (
                      <label key={option.id} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-3 text-sm font-bold ${currentAnswers[question.id] === option.id ? "border-teal-600 bg-teal-50 text-teal-950" : "border-stone-200 bg-white text-stone-800"}`}>
                        <input type="radio" name={`${part.id}-${question.id}`} checked={currentAnswers[question.id] === option.id} onChange={() => setAnswer(question.id, option.id)} />
                        {option.text}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))
            : null}

          {part.kind === "letter_mixup"
            ? part.items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-stone-200 p-4">
                  <p className="text-sm font-extrabold text-stone-900">{index + 1}. {item.prompt}</p>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="Word clue" className="mt-3 h-36 w-full rounded-xl object-contain" />
                  ) : null}
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-3 text-center text-xl font-black tracking-[0.3em] text-amber-950">{scrambledLetters(item.targetWord)}</p>
                  <input value={currentAnswers[item.id] ?? ""} onChange={(event) => setAnswer(item.id, event.target.value)} placeholder="Type the word" className="mt-3 w-full rounded-xl border-2 border-stone-200 px-3 py-3 text-base font-bold outline-none focus:border-teal-600" />
                </div>
              ))
            : null}

          {part.kind === "line_match"
            ? part.pairs.map((pair, index) => (
                <fieldset key={pair.id} className="rounded-xl border border-stone-200 p-4">
                  <legend className="px-1 text-sm font-extrabold text-stone-900">{index + 1}. {pair.left}</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {shuffled(part.pairs).map((option) => (
                      <button key={option.id} type="button" onClick={() => setAnswer(pair.id, option.id)} className={`min-h-20 rounded-xl border-2 p-2 text-left ${currentAnswers[pair.id] === option.id ? "border-teal-600 bg-teal-50" : "border-stone-200 bg-white"}`}>
                        {option.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={option.imageUrl} alt={option.right || "Picture match"} className="h-24 w-full rounded-lg object-contain" />
                        ) : null}
                        <span className="mt-1 block text-center text-xs font-bold text-stone-800">{option.right || "Choose this picture"}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))
            : null}

          {part.kind === "listen_and_choose"
            ? part.items.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-stone-200 p-4">
                  <p className="text-sm font-extrabold text-stone-900">{index + 1}. {item.prompt}</p>
                  {item.audioUrl ? (
                    <audio controls preload="metadata" src={item.audioUrl} className="mt-3 w-full" />
                  ) : item.speakText ? (
                    <button type="button" onClick={() => { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(item.speakText)); }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-extrabold text-white"><Volume2 className="h-4 w-4" /> Play audio</button>
                  ) : (
                    <p className="mt-3 text-xs font-bold text-amber-700">Audio has not been added yet.</p>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {item.choices.map((choice) => (
                      <label key={choice.id} className={`cursor-pointer rounded-xl border-2 p-3 ${currentAnswers[item.id] === choice.id ? "border-teal-600 bg-teal-50" : "border-stone-200"}`}>
                        {choice.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={choice.imageUrl} alt={choice.label || "Answer choice"} className="h-28 w-full rounded-lg object-contain" />
                        ) : null}
                        <span className="mt-1 flex items-center gap-2 text-sm font-bold text-stone-900"><input type="radio" name={`${part.id}-${item.id}`} checked={currentAnswers[item.id] === choice.id} onChange={() => setAnswer(item.id, choice.id)} />{choice.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            : null}

          {part.kind === "sentence_scramble"
            ? part.items.map((item, index) => {
                const tokens = item.sentence.split(/\s+/).filter(Boolean);
                const chosen = (currentAnswers[item.id] ?? "").split(/\s+/).filter(Boolean);
                return (
                  <div key={item.id} className="rounded-xl border border-stone-200 p-4">
                    <p className="text-sm font-extrabold text-stone-900">{index + 1}. {item.prompt}</p>
                    <div className="mt-3 min-h-14 rounded-xl border-2 border-dashed border-teal-200 bg-teal-50 p-3 text-sm font-bold text-teal-950">{chosen.join(" ") || "Tap the words in order"}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {shuffled(tokens).map((token, tokenIndex) => (
                        <button key={`${token}-${tokenIndex}`} type="button" disabled={chosen.filter((entry) => entry === token).length >= tokens.filter((entry) => entry === token).length} onClick={() => setAnswer(item.id, [...chosen, token].join(" "))} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-800 disabled:opacity-30">{token}</button>
                      ))}
                      <button type="button" onClick={() => setAnswer(item.id, "")} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-stone-500"><RotateCcw className="h-3.5 w-3.5" /> Clear</button>
                    </div>
                  </div>
                );
              })
            : null}

          {part.kind === "free_response"
            ? part.prompts.map((prompt, index) => {
                const value = currentAnswers[prompt.id] ?? "";
                return (
                  <label key={prompt.id} className="block rounded-xl border border-stone-200 p-4 text-sm font-extrabold text-stone-900">
                    {index + 1}. {prompt.prompt}
                    <textarea value={value} onChange={(event) => setAnswer(prompt.id, event.target.value)} rows={Math.max(4, Math.min(10, Math.ceil(prompt.minWords / 12)))} placeholder="Write your answer here" className="mt-3 w-full resize-y rounded-xl border-2 border-stone-200 px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-teal-600" />
                    <span className={`mt-1 block text-right text-[11px] ${wordCount(value) >= prompt.minWords ? "text-emerald-700" : "text-stone-500"}`}>{wordCount(value)} / {prompt.minWords} minimum words · {prompt.maxPoints} points</span>
                  </label>
                );
              })
            : null}
        </div>

        {notice ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">{notice}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <button type="button" disabled={pending || displayIndex === 0} onClick={() => save(false, Math.max(0, displayIndex - 1))} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-stone-300 px-4 text-sm font-bold disabled:opacity-30"><ArrowLeft className="h-4 w-4" /> Previous</button>
          <p className="text-xs font-bold text-stone-500">{recordedTotals.answered} response{recordedTotals.answered === 1 ? "" : "s"} added</p>
          {displayIndex < document.parts.length - 1 ? (
            <button type="button" disabled={pending} onClick={() => save(false, displayIndex + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-teal-700 px-4 text-sm font-extrabold text-white disabled:opacity-50">{pending ? "Saving…" : "Save & continue"}<ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button type="button" disabled={pending || authoringPreview} onClick={() => save(true)} className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 text-sm font-extrabold text-white disabled:opacity-50">{authoringPreview ? "Preview only" : pending ? "Submitting…" : "Submit homework"}</button>
          )}
        </div>
      </section>
    </div>
  );
}
